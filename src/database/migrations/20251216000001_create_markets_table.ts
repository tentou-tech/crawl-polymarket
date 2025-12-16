import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('markets', (table) => {
    table.increments('id').primary();
    table.string('condition_id').unique().notNullable();
    table.string('question_id').nullable();
    table.string('slug').nullable();
    table.jsonb('data').notNullable();
    table.string('clob_token_id_0').nullable();
    table.string('clob_token_id_1').nullable();
    table.timestamps(true, true); // created_at, updated_at

    table.index(['slug']);
    table.index(['clob_token_id_0']);
    table.index(['clob_token_id_1']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('markets');
}
