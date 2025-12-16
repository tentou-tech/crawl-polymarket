import { createPublicClient, webSocket, parseAbiItem, Log } from 'viem';
import { polygon } from 'viem/chains';
import { Event } from '../database/models/Event';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Polymarket CTF Exchange Events
const POLYMARKET_EVENTS = [
  parseAbiItem('event OrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, uint256 makerAssetId, uint256 takerAssetId, uint256 making, uint256 taking, uint256 fee)'),
  parseAbiItem('event OrdersMatched(bytes32 indexed orderHash, address indexed maker, uint256 makerAssetId, uint256 takerAssetId, uint256 making, uint256 taking)')
];

export class CrawlerService {
  private client;

  constructor() {
    // Requires WS_RPC_URL in .env, e.g. wss://polygon-mainnet.g.alchemy.com/v2/...
    const transport = process.env.WS_RPC_URL 
      ? webSocket(process.env.WS_RPC_URL) 
      : webSocket(); // Fallback to default (might fail if no URL)

    this.client = createPublicClient({
      chain: polygon,
      transport,
    });
  }

  async listen(contractAddress: string) {
    console.log(`Starting WebSocket listener for ${contractAddress}`);

    this.client.watchEvent({
      address: contractAddress as `0x${string}`,
      events: POLYMARKET_EVENTS,
      onLogs: async (logs) => {
        console.log(`Received ${logs.length} new events via WebSocket`);
        for (const log of logs) {
          await this.saveEvent(log);
        }
      },
      onError: (error) => {
        console.error('WebSocket Error:', error);
      }
    });

    console.log('Listening for events...');
  }

  private async saveEvent(log: any) {
    // Check if event already exists to avoid duplicates
    const existing = await Event.query()
      .where('transactionHash', log.transactionHash)
      .andWhere('eventName', log.eventName)
      .andWhere('blockNumber', Number(log.blockNumber))
      .first();

    if (existing) {
        return;
    }

    // Handle BigInt serialization for args
    const args = JSON.parse(JSON.stringify(log.args, (_, v) => 
        typeof v === 'bigint' ? v.toString() : v
    ));

    await Event.query().insert({
      transactionHash: log.transactionHash,
      blockNumber: Number(log.blockNumber),
      contractAddress: log.address,
      eventName: log.eventName,
      args: args,
    });
    console.log(`Saved event ${log.eventName} from tx ${log.transactionHash}`);

    // Dispatch job for OrdersMatched to fetch Market Metadata
    if (log.eventName === 'OrdersMatched') {
        const { makerAssetId, takerAssetId } = args;
        const tokenId = makerAssetId || takerAssetId;

        if (tokenId) {
            const { addMarketJob } = require('../jobs/marketQueue'); 
            await addMarketJob(tokenId.toString(), Number(log.logIndex), log.transactionHash);
            console.log(`Queued market fetch for asset ${tokenId}`);

            const { addTradeJob } = require('../jobs/tradeQueue');
            await addTradeJob(log.transactionHash, Number(log.blockNumber), Number(log.logIndex), args);
        }
    }
  }
}
