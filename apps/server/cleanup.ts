import { sql } from 'drizzle-orm';
import { db, closeDb } from './src/db/index.js';

async function main() {
  try {
    await db.execute(sql`DROP TABLE IF EXISTS "settings";`);
    await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "last_changelog_version";`);
    await db.execute(sql`DELETE FROM "__app_migrations" WHERE name = '0023_add_changelog_settings.sql';`);
    console.log('Successfully cleaned up DB');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await closeDb();
  }
}

main();