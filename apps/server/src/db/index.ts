import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema.js';

function readDatabaseUrl(): string {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is required to initialize the database client');
  }

  return env.databaseUrl;
}

export const dbPool = new Pool({
  connectionString: readDatabaseUrl(),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

export const db = drizzle(dbPool, { schema });

export type Database = typeof db;

export async function closeDb(): Promise<void> {
  await dbPool.end();
}

export * from './schema.js';
