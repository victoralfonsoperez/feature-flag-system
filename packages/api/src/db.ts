import Database from 'better-sqlite3';
import path from 'node:path';

export function initDatabase(dbPath?: string): Database.Database {
  const resolvedPath = dbPath ?? path.join(process.cwd(), 'flags.db');
  const db = new Database(resolvedPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS flags (
      app_id TEXT NOT NULL DEFAULT 'default',
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('build-time', 'runtime')),
      environment TEXT NOT NULL DEFAULT 'production',
      description TEXT DEFAULT '',
      variants TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT DEFAULT 'system',
      PRIMARY KEY (app_id, key)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT NOT NULL DEFAULT 'default',
      flag_key TEXT NOT NULL,
      action TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by TEXT DEFAULT 'system',
      changed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'viewer')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add app_id to existing flags table if it uses the old schema
  const flagsInfo = db.prepare("PRAGMA table_info(flags)").all() as { name: string }[];
  const hasAppId = flagsInfo.some((col) => col.name === 'app_id');
  if (!hasAppId) {
    db.exec(`
      ALTER TABLE flags RENAME TO flags_old;
      CREATE TABLE flags (
        app_id TEXT NOT NULL DEFAULT 'default',
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('build-time', 'runtime')),
        environment TEXT NOT NULL DEFAULT 'production',
        description TEXT DEFAULT '',
        variants TEXT DEFAULT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_by TEXT DEFAULT 'system',
        PRIMARY KEY (app_id, key)
      );
      INSERT INTO flags (key, value, type, environment, description, variants, created_at, updated_at, updated_by)
        SELECT key, value, type, environment, description, variants, created_at, updated_at, updated_by FROM flags_old;
      DROP TABLE flags_old;
    `);
  }

  // Migration: add app_id to existing audit_log table if missing
  const auditInfo = db.prepare("PRAGMA table_info(audit_log)").all() as { name: string }[];
  const auditHasAppId = auditInfo.some((col) => col.name === 'app_id');
  if (!auditHasAppId) {
    db.exec(`ALTER TABLE audit_log ADD COLUMN app_id TEXT NOT NULL DEFAULT 'default'`);
  }

  return db;
}

export type FlagRow = {
  app_id: string;
  key: string;
  value: string;
  type: 'build-time' | 'runtime';
  environment: string;
  description: string;
  variants: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string;
};

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
};

export type SessionRow = {
  id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
};

export type AuditLogRow = {
  id: number;
  app_id: string;
  flag_key: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
};

export type ApiTokenRow = {
  id: number;
  name: string;
  token_hash: string;
  created_by: number;
  last_used_at: string | null;
  created_at: string;
};
