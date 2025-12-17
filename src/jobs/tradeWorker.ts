import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { TRADE_QUEUE_NAME } from './tradeQueue';
import { Trade } from '../database/models/Trade';
import { Market } from '../database/models/Market';
import { addMarketJob } from './marketQueue';

console.log(`Initializing Trade Worker module...`);

let worker: Worker | null = null;

export const startTradeWorker = () => {
  if (worker) {
    console.log('Trade Worker already started.');
    return worker;
  }

  console.log(`Starting Trade Worker for queue: ${TRADE_QUEUE_NAME}`);
  worker = new Worker(
    TRADE_QUEUE_NAME,
    async (job: Job) => {
      const { transactionHash, blockNumber, args } = job.data;
      console.log(
        `Processing trade job for tx ${transactionHash} (Job ID: ${job.id})`
      );

      try {
        const makerAssetId = args.makerAssetId?.toString();
        const takerAssetId = args.takerAssetId?.toString();
        const making = BigInt(args.making || 0);
        const taking = BigInt(args.taking || 0);

        let tokenId = '0';
        let side = 'UNKNOWN';
        let shares = 0;
        let usdcVolume = 0;

        if (makerAssetId && makerAssetId !== '0') {
          // Maker Sells Token
          tokenId = makerAssetId;
          side = 'SELL';
          shares = Number(making); // shares sold
          usdcVolume = Number(taking); // usdc received
        } else if (takerAssetId && takerAssetId !== '0') {
          // Maker Buys Token (Maker gives USDC, Taker gives Token)
          tokenId = takerAssetId;
          side = 'BUY';
          shares = Number(taking); // shares received
          usdcVolume = Number(making); // usdc given
        } else {
          // Should not happen for valid trades involving at least one real asset
          console.log(
            `Skipping trade with no valid token ID (maker: ${makerAssetId}, taker: ${takerAssetId})`
          );
          return;
        }

        // Normalizing decimals.
        // Outcomes usually have 6 decimals (1e6). USDC has 6 decimals.
        // But shares might be raw units. Let's assume 6 decimals for both for display.
        const sharesDisplay = shares / 1e6;
        const usdcDisplay = usdcVolume / 1e6;
        const price = sharesDisplay > 0 ? usdcDisplay / sharesDisplay : 0;

        console.log(
          `Trade details: ${side} ${sharesDisplay} shares of ${tokenId} for $${usdcDisplay} ($${price.toFixed(
            4
          )})`
        );

        // Queue market fetch if not exists
        // Find market to get Name and Outcome
        const market = await Market.query()
          .where('clobTokenId_0', tokenId)
          .orWhere('clobTokenId_1', tokenId)
          .first();

        let marketSlug = null;
        let outcome = null;

        if (market) {
          marketSlug = market.slug;
          const clobTokenIds = JSON.parse(market.data.clobTokenIds || '[]');
          const outcomes = JSON.parse(market.data.outcomes || '[]');
          const tokenIndex = clobTokenIds.indexOf(tokenId);
          if (tokenIndex !== -1 && outcomes[tokenIndex]) {
            outcome = outcomes[tokenIndex];
          }
          const liquidityNum = Number(market.data.liquidity || 0);
          // Simple formatting for finding it easily
          console.log(
            `Matched Market: ${marketSlug}, Outcome: ${outcome}, Liquidity: ${liquidityNum}`
          );
        } else {
          // Only queue market fetch if we haven't found it.
          // (Existing logic queues it anyway, which triggers debounced job)
          await addMarketJob(tokenId, 0, transactionHash); // logIndex 0 generic
          throw new Error(`Market not found for token ${tokenId}. Retrying...`);
        }

        // Save Trade
        await Trade.query().insert({
          transactionHash,
          blockNumber,
          maker: args.maker?.toString(),
          taker: args.taker?.toString(),
          orderHash: args.orderHash?.toString(),
          assetId: tokenId,
          side,
          marketSlug,
          outcome,
          price,
          shares: sharesDisplay,
          usdcVolume: usdcDisplay,
          timestamp: new Date().toISOString(),
        });

        console.log(`Saved trade ${side} for ${marketSlug || tokenId}`);
      } catch (error) {
        console.error(`Trade Job failed for tx ${transactionHash}:`, error);
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on('ready', () => {
    console.log('Trade Worker is ready and connected to Redis.');
  });

  return worker;
};
