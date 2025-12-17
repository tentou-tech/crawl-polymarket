import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const TRADE_QUEUE_NAME = 'trade-queue';

export const tradeQueue = new Queue(TRADE_QUEUE_NAME, {
  connection: redisConnection,
});

export const addTradeJob = async (
  transactionHash: string,
  blockNumber: number,
  logIndex: number,
  args: any
) => {
  await tradeQueue.add(
    `trade-${transactionHash}-${logIndex}`,
    {
      transactionHash,
      blockNumber,
      logIndex,
      args,
    },
    {
      jobId: `trade-${transactionHash}-${logIndex}`, // Deduplicate by tx-logIndex
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 10,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    }
  );
};
