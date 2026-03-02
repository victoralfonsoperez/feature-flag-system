import Database from 'better-sqlite3';
import path from 'node:path';

export function initDatabase(dbPath?: string) {
  const resolvedPath = dbPath ?? path.join(process.cwd(), 'flags.db');
  const db = new Database(resolvedPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS flags (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('build-time', 'runtime')),
      environment TEXT NOT NULL DEFAULT 'production',
      description TEXT DEFAULT '',
      variants TEXT DEFAULT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT DEFAULT 'system'
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flag_key TEXT NOT NULL,
      action TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by TEXT DEFAULT 'system',
      changed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

export type FlagRow = {
  key: string;
  value: string;
  type: 'build-time' | 'runtime';
  environment: string;
  description: string;
  variants: string | null;
  updated_at: string;
  updated_by: string;
};
