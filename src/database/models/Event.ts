import { Model } from 'objection';

export class Event extends Model {
  static get tableName() {
    return 'events';
  }

  id!: number;
  transactionHash!: string;
  blockNumber!: number;
  contractAddress!: string;
  eventName!: string;
  args!: Record<string, any>;
  createdAt!: Date;

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['transactionHash', 'blockNumber', 'contractAddress', 'eventName'],

      properties: {
        id: { type: 'integer' },
        transactionHash: { type: 'string' },
        blockNumber: { type: 'integer' },
        contractAddress: { type: 'string' },
        eventName: { type: 'string' },
        args: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    };
  }
}
