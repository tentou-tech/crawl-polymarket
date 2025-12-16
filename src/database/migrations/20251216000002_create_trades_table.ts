import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('trades', (table) => {
    table.increments('id').primary();
    table.string('transaction_hash').notNullable();
    table.bigInteger('block_number').notNullable();
    
    table.string('maker').notNullable();
    table.string('taker').nullable();
    
    table.string('order_hash').notNullable();
    table.string('asset_id').notNullable();
    table.string('side').notNullable(); // 'BUY' or 'SELL'
    
    table.string('market_slug').nullable();
    table.string('outcome').nullable();

    table.decimal('price', 20, 10).notNullable();
    table.decimal('shares', 30, 10).notNullable();
    table.decimal('usdc_volume', 30, 10).notNullable();

    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['asset_id']);
    table.index(['market_slug']);
    table.index(['transaction_hash']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('trades');
}
