import { db, type Database } from './index.js';

export type DbClient = Database;

export abstract class Repository {
  protected readonly db: DbClient;

  protected constructor(dbClient: DbClient = db) {
    this.db = dbClient;
  }
}
