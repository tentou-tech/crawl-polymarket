import { ConnectionOptions } from 'bullmq';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const redisConnection: ConnectionOptions = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
};
