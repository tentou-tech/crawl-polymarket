import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { MARKET_QUEUE_NAME } from './marketQueue';
import { MarketService } from '../services/market';
import { Market } from '../database/models/Market';
import logger from '../utils/logger';

logger.info(`Initializing Market Worker module...`);

const marketService = new MarketService();

let worker: Worker | null = null;

export const startMarketWorker = () => {
  if (worker) {
    logger.info('Market Worker already started.');
    return worker;
  }

  logger.info(`Starting Market Worker for queue: ${MARKET_QUEUE_NAME}`);
  worker = new Worker(
    MARKET_QUEUE_NAME,
    async (job: Job) => {
      logger.info(`Processing market job ${job.name} (Job ID: ${job.id})`);

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
        logger.warn(`Unknown job name: ${job.name}`);
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on('ready', () => {
    logger.info('Worker is ready and connected to Redis.');
  });

  worker.on('error', (err) => {
    logger.error(err, 'Worker failed to connect/error');
  });

  worker.on('failed', (job, err) => {
    logger.error(err, `Job ${job?.id} failed with error ${err.message}`);
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

    logger.info(`SDK returned market: ${market?.slug || market?.market_slug}`);

    if (!market) {
      logger.info(`No market found for asset ${makerAssetId}`);
      return;
    }

    // Support both Gamma API (camelCase) and SDK (snake_case)
    const conditionId = market.conditionId || market.condition_id;
    const slug = market.slug || market.market_slug;
    const questionId = market.questionID || market.question_id;

    if (!conditionId || !slug) {
      logger.error({ market }, 'Invalid market data');
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
      logger.error(e, `Failed to parse clobTokenIds: ${clobTokenIdsStr}`);
      clobTokenIds = [];
    }
    const clobTokenId0 = clobTokenIds[0] || null;
    const clobTokenId1 = clobTokenIds[1] || null;

    if (existing) {
      // Update data if needed
      await existing.$query().patch({
        data: market,
        clobTokenId0,
        clobTokenId1,
        updatedAt: new Date().toISOString() as any, // Cast to any to satisfy TS validation if needed
      });
      logger.info(`Updated market ${slug}`);
    } else {
      await Market.query().insert({
        conditionId,
        questionId: questionId,
        slug,
        clobTokenId0,
        clobTokenId1,
        data: market,
      });
      logger.info(`Created market ${slug}`);
    }
  } catch (error) {
    logger.error(error, `Job failed for asset ${makerAssetId}`);
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

    // If clobTokenId0 exists, fetch the latest market data for it
    if (market.clobTokenId0) {
      const newMarketInfoResponse = await marketService.getMarketByTokenId(
        market.clobTokenId0
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

        logger.info(
          `Fetched latest market info for ${market.clobTokenId0} during resolution.`
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

    logger.info(`Updated market ${market.slug} with resolution data.`);
  } catch (error) {
    logger.error(
      error,
      `Failed to process resolution for questionId ${questionId}`
    );
    throw error;
  }
}

// Exporting a singleton-like getter if needs to be accessed by BullBoard
// Note: BullBoard adapter needs the Queue instance, not the Worker. The Worker processes jobs.
// But if you wanted to expose the worker, you can.
export const marketWorker = worker; // This will be null initially with this pattern, beware.
// Ideally, only index.ts calls startMarketWorker() and we don't need to export the worker instance unless necessary.
