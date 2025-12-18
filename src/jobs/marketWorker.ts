import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { MARKET_QUEUE_NAME } from './marketQueue';
import { MarketService } from '../services/market';
import { Market } from '../database/models/Market';

console.log(`Initializing Market Worker module...`);

const marketService = new MarketService();

let worker: Worker | null = null;

export const startMarketWorker = () => {
  if (worker) {
    console.log('Market Worker already started.');
    return worker;
  }

  console.log(`Starting Market Worker for queue: ${MARKET_QUEUE_NAME}`);
  worker = new Worker(
    MARKET_QUEUE_NAME,
    async (job: Job) => {
      console.log(`Processing market job ${job.name} (Job ID: ${job.id})`);

      if (job.name === 'fetch-market-metadata') {
        const { makerAssetId } = job.data;
        await processFetchMarketMetadata(makerAssetId);
      } else if (job.name === 'process-market-resolution') {
        const { questionId, settledPrice, payouts, transactionHash } = job.data;
        await processMarketResolution(
          questionId,
          settledPrice,
          payouts,
          transactionHash
        );
      } else {
        console.warn(`Unknown job name: ${job.name}`);
      }
    },
    {
      connection: redisConnection,
      concurrency: 2, // Low concurrency to rate limit API calls
      limiter: {
        max: 5,
        duration: 1000, // Max 5 requests per second
      },
    }
  );

  worker.on('ready', () => {
    console.log('Worker is ready and connected to Redis.');
  });

  worker.on('error', (err) => {
    console.error('Worker failed to connect/error:', err);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error ${err.message}`);
  });

  return worker;
};

async function processFetchMarketMetadata(makerAssetId: string) {
  try {
    const marketsResponse = await marketService.getMarketByTokenId(
      makerAssetId
    );

    const market = Array.isArray(marketsResponse)
      ? marketsResponse[0]
      : marketsResponse;

    console.log(`SDK returned market: ${market?.slug || market?.market_slug}`);

    if (!market) {
      console.log(`No market found for asset ${makerAssetId}`);
      return;
    }

    // Support both Gamma API (camelCase) and SDK (snake_case)
    const conditionId = market.conditionId || market.condition_id;
    const slug = market.slug || market.market_slug;
    const questionId = market.questionID || market.question_id;

    if (!conditionId || !slug) {
      console.error('Invalid market data:', market);
      return;
    }

    // Save or Update
    const existing = await Market.query().findOne({ conditionId });

    const clobTokenIdsStr =
      market.clobTokenIds || market.clob_token_ids || '[]';
    let clobTokenIds = [];
    try {
      clobTokenIds = JSON.parse(clobTokenIdsStr);
    } catch (e) {
      console.error('Failed to parse clobTokenIds:', clobTokenIdsStr);
      clobTokenIds = [];
    }
    const clobTokenId_0 = clobTokenIds[0] || null;
    const clobTokenId_1 = clobTokenIds[1] || null;

    if (existing) {
      // Update data if needed
      await existing.$query().patch({
        data: market,
        clobTokenId_0,
        clobTokenId_1,
        updatedAt: new Date().toISOString() as any, // Cast to any to satisfy TS validation if needed
      });
      console.log(`Updated market ${slug}`);
    } else {
      await Market.query().insert({
        conditionId,
        questionId: questionId,
        slug,
        clobTokenId_0,
        clobTokenId_1,
        data: market,
      });
      console.log(`Created market ${slug}`);
    }
  } catch (error) {
    console.error(`Job failed for asset ${makerAssetId}:`, error);
    throw error;
  }
}

async function processMarketResolution(
  questionId: string,
  settledPrice: string,
  payouts: string[],
  transactionHash: string
) {
  try {
    const market = await Market.query().findOne({ questionId });

    if (!market) {
      throw new Error(
        `Market not found for questionId ${questionId}, cannot process resolution.`
      );
    }

    let updatedMarketData = market.data;

    // If clobTokenId_0 exists, fetch the latest market data for it
    if (market.clobTokenId_0) {
      const newMarketInfoResponse = await marketService.getMarketByTokenId(
        market.clobTokenId_0
      );

      const newMarketInfo = Array.isArray(newMarketInfoResponse)
        ? newMarketInfoResponse[0]
        : newMarketInfoResponse;

      if (newMarketInfo) {
        // If the market is not yet closed in the API, throw an error to retry the job.
        // Sometimes the SDK/API lags behind the blockchain event.
        if (newMarketInfo.closed === false) {
          throw new Error(
            `Market ${market.slug} is not yet closed in Polymarket API. Retrying resolution process...`
          );
        }

        console.log(
          `Fetched latest market info for ${market.clobTokenId_0} during resolution.`
        );
        updatedMarketData = { ...updatedMarketData, ...newMarketInfo };
      }
    }

    const resolutionData = {
      settledPrice,
      payouts,
      resolvedAt: new Date().toISOString(),
      transactionHash,
    };

    // Merge resolution data into the updated market data
    updatedMarketData = { ...updatedMarketData, resolution: resolutionData };

    await market.$query().patch({
      data: updatedMarketData,
      updatedAt: new Date().toISOString() as any,
    });

    console.log(`Updated market ${market.slug} with resolution data.`);
  } catch (error) {
    console.error(
      `Failed to process resolution for questionId ${questionId}:`,
      error
    );
    throw error;
  }
}

// Exporting a singleton-like getter if needs to be accessed by BullBoard
// Note: BullBoard adapter needs the Queue instance, not the Worker. The Worker processes jobs.
// But if you wanted to expose the worker, you can.
export const marketWorker = worker; // This will be null initially with this pattern, beware.
// Ideally, only index.ts calls startMarketWorker() and we don't need to export the worker instance unless necessary.
