import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const name = '0002_phone_otp_auth.sql';
const exists = await client.query('SELECT 1 FROM "__app_migrations" WHERE name = $1 LIMIT 1', [name]);
if (exists.rowCount) {
  console.log('already applied');
  await client.end();
  process.exit(0);
}
const raw = await readFile('apps/server/drizzle/0002_phone_otp_auth.sql', 'utf8');
const statements = raw
  .split(/--> statement-breakpoint\s*/g)
  .map((s) => s.trim())
  .filter(Boolean);
try {
  await client.query('BEGIN');
  for (const statement of statements) {
    await client.query(statement);
  }
  await client.query('INSERT INTO "__app_migrations" (name) VALUES ($1)', [name]);
  await client.query('COMMIT');
  console.log('applied', name);
} catch (error) {
  await client.query('ROLLBACK');
  console.error(error);
  process.exitCode = 1;
}
await client.end();
