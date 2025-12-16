import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const MARKET_QUEUE_NAME = 'market-queue';

export const marketQueue = new Queue(MARKET_QUEUE_NAME, {
  connection: redisConnection,
});

export const addMarketJob = async (makerAssetId: string, logIndex: number, transactionHash: string) => {
  // Use a deterministic job ID to avoid processing the same asset multiple times redundantly if desired,
  // or just unique per event occurrence.
  // For metadata, we probably only need to fetch it once per asset ID, but let's just queue it.
  // Using assetId as jobId would debounce it, which is good.
  await marketQueue.add('fetch-market-metadata', {
    makerAssetId,
    transactionHash
  }, {
    jobId: `market-${makerAssetId}`, // Debounce: only one job per asset ID active/completed
    removeOnComplete: true,
    removeOnFail: 100 // Keep some history
  });
};
