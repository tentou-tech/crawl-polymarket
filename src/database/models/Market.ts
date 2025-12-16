import { Model } from 'objection';

export class Market extends Model {
  static get tableName() {
    return 'markets';
  }

  id!: number;
  conditionId!: string;
  questionId!: string;
  slug!: string;
  clobTokenId_0!: string | null;
  clobTokenId_1!: string | null;
  data!: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['conditionId', 'slug'],

      properties: {
        id: { type: 'integer' },
        conditionId: { type: 'string' },
        questionId: { type: 'string' },
        slug: { type: 'string' },
        clobTokenId_0: { type: ['string', 'null'] },
        clobTokenId_1: { type: ['string', 'null'] },
        data: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    };
  }
}
