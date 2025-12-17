import { parseAbiItem } from 'viem';
import { BaseCrawlerService } from './BaseCrawler';

// Polymarket CTF Exchange Events
const POLYMARKET_EVENTS = [
  parseAbiItem(
    'event OrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, uint256 makerAssetId, uint256 takerAssetId, uint256 making, uint256 taking, uint256 fee)'
  ),
  parseAbiItem(
    'event OrdersMatched(bytes32 indexed orderHash, address indexed maker, uint256 makerAssetId, uint256 takerAssetId, uint256 making, uint256 taking)'
  ),
];

export class CrawlerCTFExchangeService extends BaseCrawlerService {
  constructor() {
    super(POLYMARKET_EVENTS);
  }

  protected async onEventSaved(eventName: string, args: any, log: any) {
    // Dispatch job for OrdersMatched to fetch Market Metadata
    if (eventName === 'OrdersMatched') {
      const { makerAssetId, takerAssetId } = args;
      const tokenId = makerAssetId || takerAssetId;

      if (tokenId) {
        const { addMarketJob } = require('../jobs/marketQueue');
        await addMarketJob(
          tokenId.toString(),
          Number(log.logIndex),
          log.transactionHash
        );
        console.log(`Queued market fetch for asset ${tokenId}`);

        const { addTradeJob } = require('../jobs/tradeQueue');
        await addTradeJob(
          log.transactionHash,
          Number(log.blockNumber),
          Number(log.logIndex),
          args
        );
      }
    }
  }
}