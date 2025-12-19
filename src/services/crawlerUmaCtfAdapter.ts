import { parseAbiItem, PublicClient } from 'viem';
import { BaseCrawlerService } from './BaseCrawler';

// UMA CTF Adapter Events
const UMA_CTF_ADAPTER_EVENTS = [
  parseAbiItem(
    'event QuestionResolved(bytes32 indexed questionID, int256 indexed settledPrice, uint256[] payouts)'
  ),
];

export class CrawlerUmaCtfAdapterService extends BaseCrawlerService {
  constructor(client?: PublicClient) {
    super(UMA_CTF_ADAPTER_EVENTS, client);
  }

  protected async onEventSaved(eventName: string, args: any, log: any) {
    if (eventName === 'QuestionResolved') {
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