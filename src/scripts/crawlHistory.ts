import { Model } from 'objection';
import Knex from 'knex';
import knexConfig from '../database/knexfile';
import { createPublicClient, http } from 'viem';
import { polygon } from 'viem/chains';

import { CrawlerCTFExchangeService } from '../services/crawlerCtfExchange';
import { CrawlerUmaCtfAdapterService } from '../services/crawlerUmaCtfAdapter';
import { startMarketWorker } from '../jobs/marketWorker';
import { startTradeWorker } from '../jobs/tradeWorker';

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function start() {
  // Initialize DB
  const knex = Knex(knexConfig);
  Model.knex(knex);
  console.log('Database connected');

  // Start Workers
  console.log('Starting workers...');
  startMarketWorker();
  startTradeWorker();

  // Polymarket CTF Exchange Addresses
  const CTF_EXCHANGE_CONTRACTS = [
    '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E', // CTF Exchange
    '0xC5d563A36AE78145C45a50134d48A1215220f80a', // Neg Risk Adapter
  ];

  // UMA CTF Adapter Addresses
  const UMA_CTF_ADAPTER_CONTRACTS = [
    '0x6A9D222616C90FcA5754cd1333cFD9b7fb6a4F74',
    '0x157ce2d672854c848c9b79c49a8cc6cc89176a49',
  ];

  // Using http transport for historical fetches as it's generally more stable
  // for large number of requests than websockets for one-off tasks.
  const publicClient = createPublicClient({
    chain: polygon,
    transport: http(process.env.RPC_URL),
  });

  const crawlerCTF = new CrawlerCTFExchangeService(publicClient);
  const crawlerUMA = new CrawlerUmaCtfAdapterService(publicClient);

  const currentBlock = await publicClient.getBlockNumber();
  // Example: Start from block 30000000 (adjust as needed for actual contract deployment)
  const fromBlock = 80000000n;
  const toBlock = 80381094n;

  console.log(
    `Starting historical crawl from block ${fromBlock} to ${toBlock}`
  );

  // Crawl CTF Exchange Contracts
  await Promise.all(
    CTF_EXCHANGE_CONTRACTS.map((address) =>
      crawlerCTF.crawlHistory(address, fromBlock, toBlock)
    )
  );

  // Crawl UMA CTF Adapter Contracts
  // await Promise.all(
  //   UMA_CTF_ADAPTER_CONTRACTS.map((address) =>
  //     crawlerUMA.crawlHistory(address, fromBlock, toBlock)
  //   )
  // );

  console.log('All historical crawls completed.');
  console.log(
    'Process will stay alive to allow workers to finish processing...'
  );
  // await knex.destroy(); // Do not close DB connection, workers need it
  // process.exit(0); // Do not exit, keep workers running
}

start().catch((err) => {
  console.error('Error during historical crawl:', err);
  process.exit(1);
});
