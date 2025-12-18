import { Model } from 'objection';
import Knex from 'knex';
import knexConfig from './database/knexfile';
import { CrawlerCTFExchangeService } from './services/crawlerCtfExchange';
import { CrawlerUmaCtfAdapterService } from './services/crawlerUmaCtfAdapter';
import { startMarketWorker } from './jobs/marketWorker'; // Start worker
import { marketQueue } from './jobs/marketQueue';
import { tradeQueue } from './jobs/tradeQueue';

import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { Event } from './database/models/Event'; // Explicit import to bind

async function start() {
  // Initialize DB
  const knex = Knex(knexConfig);
  Model.knex(knex);
  console.log('Database connected');
  console.log('Model.knex() is set:', !!Model.knex());
  console.log('Event.knex() is set:', !!Event.knex());

  // Bull Board Setup
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  // Start Workers
  startMarketWorker();

  const { startTradeWorker } = await import('./jobs/tradeWorker');
  startTradeWorker();

  createBullBoard({
    queues: [new BullMQAdapter(marketQueue), new BullMQAdapter(tradeQueue)],
    serverAdapter: serverAdapter,
  });

  const app = express();
  app.use('/admin/queues', serverAdapter.getRouter());

  app.listen(3000, () => {
    console.log('Running on 3000...');
    console.log('For the UI, open http://localhost:3000/admin/queues');
  });

  // Polymarket CTF Exchange Addresses
  const CTF_EXCHANGE_CONTRACTS = [
    '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E', // CTF Exchange
    '0xC5d563A36AE78145C45a50134d48A1215220f80a', // Neg Risk Adapter
  ];

  // UMA CTF Adapter Addresses
  const UMA_CTF_ADAPTER_CONTRACTS = [
    '0x6A9D222616C90FcA5754cd1333cFD9b7fb6a4F74',
    '0x157ce2d672854c848c9b79c49a8cc6cc89176a49',
    '0x65070BE91477460D8A7AeEb94ef92fe056C2f2A7',
    '0x2F5e3684cb1F318ec51b00Edba38d79Ac2c0aA9d',
  ];

  const crawlerCtxExchangeService = new CrawlerCTFExchangeService();
  const crawlerUmaCtfAdapterService = new CrawlerUmaCtfAdapterService();

  // Start listening for CTF Exchange contracts
  await crawlerCtxExchangeService.listen(CTF_EXCHANGE_CONTRACTS);

  // Start listening for UMA CTF Adapter contracts
  await crawlerUmaCtfAdapterService.listen(UMA_CTF_ADAPTER_CONTRACTS);

  // Test SDK Integration
  // try {
  //     const { MarketService } = await import('./services/market');
  //     const marketService = new MarketService();
  //     const market = await marketService.client.getMarket
  //     ('35202350012414952759827037718672984608717610908615367494687057298083953893042');
  //     console.log(market);
  //     console.log('CLOB Market:', market.market_slug);

  //     // Test Gamma API via Axios
  //     // Using a known slug or the one we just fetched
  //     // if (market.market_slug) {
  //     //     const eventData = await marketService.getEventBySlug(market.market_slug);
  //     //     console.log('Gamma Event Data (partial):', eventData ? eventData.id : 'Not found');
  //     // }
  // } catch (err) {
  //     console.error("Failed to run SDK test:", err);
  // }

  // Keep process alive
  process.on('SIGTERM', async () => {
    // await crawlerWorker.close(); // Worker unused now
    process.exit(0);
  });
}

start().catch((err) => {
  console.error('Error starting app:', err);
  process.exit(1);
});
