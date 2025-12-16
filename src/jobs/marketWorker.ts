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
        const { makerAssetId } = job.data;
        console.log(`Processing market job for asset ${makerAssetId} (Job ID: ${job.id})`);
    
        try {
          // Check if we already have this market in DB? 
          // Ideally check by assetId relation, but we only have Market model storing raw data.
          // We'll fetch from API first.
          
          // Polymarket SDK getMarkets usually takes a string filter or object. 
          // Based on docs, it supports filtering by token_id or asset_id.
          // We'll try passing `token_id`.
          // Note: SDK types might require casting if strictly typed.
          // note: user manually changed to getMarket(single)
          // note: user manually changed to getMarket(single)
          const marketsResponse = await marketService.getMarketByTokenId(makerAssetId);
          
          const market = Array.isArray(marketsResponse) ? marketsResponse[0] : marketsResponse;
          
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
          
          const clobTokenIdsStr = market.clobTokenIds || market.clob_token_ids || '[]';
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
      },
      {
        connection: redisConnection,
        concurrency: 2, // Low concurrency to rate limit API calls
        limiter: {
          max: 5,
          duration: 1000 // Max 5 requests per second
        }
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

// Exporting a singleton-like getter if needs to be accessed by BullBoard
// Note: BullBoard adapter needs the Queue instance, not the Worker. The Worker processes jobs.
// But if you wanted to expose the worker, you can.
export const marketWorker = worker; // This will be null initially with this pattern, beware.
// Ideally, only index.ts calls startMarketWorker() and we don't need to export the worker instance unless necessary.
