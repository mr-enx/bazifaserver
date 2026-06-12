import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { closeDb, db } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../../drizzle');
const skippedMigrations = new Set(['0001_curious_firedrake.sql']);

async function ensureMigrationTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "__app_migrations" (
      "name" text PRIMARY KEY,
      "applied_at" timestamp DEFAULT now() NOT NULL
    )
  `);
}

async function hasMigrationRun(name: string): Promise<boolean> {
  const result = await db.execute(sql`SELECT 1 FROM "__app_migrations" WHERE "name" = ${name} LIMIT 1`);
  return result.rows.length > 0;
}

async function applyMigration(name: string, contents: string) {
  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(contents));
    await tx.execute(sql`INSERT INTO "__app_migrations" ("name") VALUES (${name})`);
  });
}

async function markMigrationAsSkipped(name: string) {
  await db.execute(sql`
    INSERT INTO "__app_migrations" ("name")
    VALUES (${name})
    ON CONFLICT ("name") DO NOTHING
  `);
}

try {
  await ensureMigrationTable();

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    if (await hasMigrationRun(file)) {
      continue;
    }

    if (skippedMigrations.has(file)) {
      await markMigrationAsSkipped(file);
      console.log(`Skipped legacy migration ${file}`);
      continue;
    }

    const contents = await readFile(path.join(migrationsDir, file), 'utf8');
    await applyMigration(file, contents);
    console.log(`Applied migration ${file}`);
  }

  if (files.length === 0) {
    console.log('No migrations found.');
  }
} finally {
  await closeDb();
}
