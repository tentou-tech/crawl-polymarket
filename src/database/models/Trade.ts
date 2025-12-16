import { Model } from 'objection';

export class Trade extends Model {
  static get tableName() {
    return 'trades';
  }

  id!: number;
  transactionHash!: string;
  blockNumber!: number;
  maker!: string;
  taker!: string | null; // optional
  orderHash!: string;
  assetId!: string;
  side!: string;
  marketSlug!: string | null;
  outcome!: string | null;
  price!: number;
  shares!: number;
  usdcVolume!: number;
  timestamp!: Date | string;
  createdAt!: Date | string;

  static get jsonSchema() {
    return {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        transactionHash: { type: 'string' },
        blockNumber: { type: 'integer' },
        maker: { type: 'string' },
        taker: { type: 'string' },
        orderHash: { type: 'string' },
        assetId: { type: 'string' },
        side: { type: ['string', 'null'] },
        marketSlug: { type: ['string', 'null'] },
        outcome: { type: ['string', 'null'] },
        price: { type: 'number' },
        shares: { type: 'number' },
        usdcVolume: { type: 'number' },
        timestamp: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    };
  }
}
