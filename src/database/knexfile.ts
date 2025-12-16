import { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { knexSnakeCaseMappers } = require('objection');

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'crawler_db',
  },
  migrations: {
    directory: path.join(__dirname, './migrations'),
    extension: path.extname(__filename).slice(1), // 'ts' or 'js'
  },
  ...knexSnakeCaseMappers(),
};

export default config;
