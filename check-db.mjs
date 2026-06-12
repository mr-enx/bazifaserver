import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
console.log('TABLES');
for (const row of tables.rows) console.log(row.table_name);
try {
  const migrations = await client.query('SELECT name FROM "__app_migrations" ORDER BY name');
  console.log('MIGRATIONS');
  for (const row of migrations.rows) console.log(row.name);
} catch {
  console.log('MIGRATIONS_TABLE_MISSING');
}
await client.end();
