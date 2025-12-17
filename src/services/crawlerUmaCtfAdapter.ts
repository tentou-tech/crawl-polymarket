import { createPublicClient, webSocket, parseAbiItem } from 'viem';
import { polygon } from 'viem/chains';
import { Event } from '../database/models/Event';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// UMA CTF Adapter Events
const UMA_CTF_ADAPTER_EVENTS = [
  parseAbiItem(
    'event QuestionResolved(bytes32 indexed questionID, int256 indexed settledPrice, uint256[] payouts)'
  ),
];

export class CrawlerUmaCtfAdapterService {
  private client;

  constructor() {
    // Requires WS_RPC_URL in .env
    const transport = process.env.WS_RPC_URL
      ? webSocket(process.env.WS_RPC_URL)
      : webSocket(); 

    this.client = createPublicClient({
      chain: polygon,
      transport,
    });
  }

  async listen(contractAddress: string) {
    console.log(`Starting WebSocket listener for UMA CTF Adapter ${contractAddress}`);

    this.client.watchEvent({
      address: contractAddress as `0x${string}`,
      events: UMA_CTF_ADAPTER_EVENTS,
      onLogs: async (logs) => {
        console.log(`Received ${logs.length} new UMA CTF Adapter events via WebSocket`);
        for (const log of logs) {
          await this.saveEvent(log);
        }
      },
      onError: (error) => {
        console.error('WebSocket Error (UMA CTF Adapter):', error);
      },
    });

    console.log(`Listening for UMA CTF Adapter events on ${contractAddress}...`);
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
    const args = JSON.parse(
      JSON.stringify(log.args, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v
      )
    );

    await Event.query().insert({
      transactionHash: log.transactionHash,
      blockNumber: Number(log.blockNumber),
      contractAddress: log.address,
      eventName: log.eventName,
      args: args,
    });
    console.log(`Saved event ${log.eventName} from tx ${log.transactionHash}`);

    if (log.eventName === 'QuestionResolved') {
      const { questionID, settledPrice, payouts } = args;
      if (questionID) {
        const { addMarketResolutionJob } = require('../jobs/marketQueue');
        await addMarketResolutionJob(
          questionID,
          settledPrice.toString(),
          payouts.map((p: any) => p.toString()),
          log.transactionHash
        );
        console.log(`Queued market resolution for question ${questionID}`);
      }
    }
  }
}
