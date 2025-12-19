import { createPublicClient, webSocket, http, PublicClient } from 'viem';
import { polygon } from 'viem/chains';
import { Event } from '../database/models/Event';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export abstract class BaseCrawlerService {
  protected client: PublicClient;
  protected eventsAbi: any[];

  constructor(eventsAbi: any[], client?: PublicClient) {
    this.eventsAbi = eventsAbi;

    if (client) {
      this.client = client;
    } else {
      // Requires WS_RPC_URL or RPC_URL in .env
      const transport = process.env.WS_RPC_URL
        ? webSocket(process.env.WS_RPC_URL)
        : http(process.env.RPC_URL);

      this.client = createPublicClient({
        chain: polygon,
        transport,
      }) as PublicClient;
    }
  }

  async listen(contractAddress: string | string[]) {
    console.log(`Starting WebSocket listener for ${contractAddress}`);
    this.client.watchEvent({
      address: contractAddress as `0x${string}` | `0x${string}`[],
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

  async crawlHistory(
    contractAddress: string | string[],
    fromBlock: bigint,
    toBlock: bigint
  ) {
    console.log(
      `Starting historical crawl for ${contractAddress} from ${fromBlock} to ${toBlock}`
    );

    const CHUNK_SIZE = 10n;
    let currentBlock = fromBlock;

    while (currentBlock <= toBlock) {
      const endBlock =
        currentBlock + CHUNK_SIZE > toBlock
          ? toBlock
          : currentBlock + CHUNK_SIZE;
      console.log(`Fetching logs from ${currentBlock} to ${endBlock}...`);

      try {
        const logs = await this.client.getLogs({
          address: contractAddress as `0x${string}` | `0x${string}`[],
          events: this.eventsAbi,
          fromBlock: currentBlock,
          toBlock: endBlock,
        });

        console.log(`Received ${logs.length} historical events`);
        for (const log of logs) {
          await this.processLog(log);
        }
      } catch (e) {
        console.error(
          `Error fetching logs for range ${currentBlock}-${endBlock}:`,
          e
        );
      }

      currentBlock = endBlock + 1n;
    }
    console.log('Historical crawl completed.');
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
