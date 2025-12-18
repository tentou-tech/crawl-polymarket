import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('markets', (table) => {
    table.renameColumn('clob_token_id_0', 'clob_token_id0');
    table.renameColumn('clob_token_id_1', 'clob_token_id1');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('markets', (table) => {
    table.renameColumn('clob_token_id0', 'clob_token_id_0');
    table.renameColumn('clob_token_id1', 'clob_token_id_1');
  });
}