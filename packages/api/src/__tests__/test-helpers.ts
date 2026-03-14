import { initDatabase, type Database } from '../db.js';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://kanary_test:kanary_test@localhost:5433/kanary_test';

export async function createTestDb(): Promise<Database> {
  const db = await initDatabase(TEST_DATABASE_URL);
  await cleanTables(db);
  return db;
}

export async function cleanTables(db: Database): Promise<void> {
  await db.exec('DELETE FROM audit_log');
  await db.exec('DELETE FROM api_tokens');
  await db.exec('DELETE FROM sessions');
  await db.exec('DELETE FROM flags');
  await db.exec('DELETE FROM users');
}
