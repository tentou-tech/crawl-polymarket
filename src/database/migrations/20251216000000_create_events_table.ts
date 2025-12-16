import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('events', (table) => {
    table.increments('id').primary();
    table.string('transaction_hash').notNullable();
    table.bigInteger('block_number').notNullable();
    table.string('contract_address').notNullable();
    table.string('event_name').notNullable();
    table.jsonb('args').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['transaction_hash', 'event_name']);
    table.index(['contract_address', 'block_number']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('events');
}
