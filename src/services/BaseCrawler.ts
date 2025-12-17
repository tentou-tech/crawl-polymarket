import { createPublicClient, webSocket } from 'viem';
import { polygon } from 'viem/chains';
import { Event } from '../database/models/Event';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export abstract class BaseCrawlerService {
  protected client;
  protected eventsAbi: any[];

  constructor(eventsAbi: any[]) {
    this.eventsAbi = eventsAbi;
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
    console.log(`Starting WebSocket listener for ${contractAddress}`);

    this.client.watchEvent({
      address: contractAddress as `0x${string}`,
      events: this.eventsAbi,
      onLogs: async (logs) => {
        console.log(
          `Received ${logs.length} new events via WebSocket on ${contractAddress}`
        );
        for (const log of logs) {
          await this.processLog(log);
        }
      },
      onError: (error) => {
        console.error(`WebSocket Error (${contractAddress}):`, error);
      },
    });

    console.log(`Listening for events on ${contractAddress}...`);
  }

  private async processLog(log: any) {
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

    await this.onEventSaved(log.eventName as string, args, log);
  }

  protected abstract onEventSaved(
    eventName: string,
    args: any,
    log: any
  ): Promise<void>;
}
