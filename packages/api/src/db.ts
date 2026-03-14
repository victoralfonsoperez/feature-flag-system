import pg from 'pg';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type DbResult<T = Record<string, unknown>> = {
  rows: T[];
  rowCount: number;
};

export interface Database {
  query<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<DbResult<T>>;
  getOne<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  getAll<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T[]>;
  run(sql: string, ...params: unknown[]): Promise<DbResult>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

/**
 * Convert `?` positional params to `$1, $2, ...` for PostgreSQL.
 * Skips `?` inside single-quoted strings.
 */
function convertParams(sql: string): string {
  let idx = 0;
  let inString = false;
  let result = '';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && !inString) {
      inString = true;
      result += ch;
    } else if (ch === "'" && inString) {
      // Check for escaped quote ''
      if (i + 1 < sql.length && sql[i + 1] === "'") {
        result += "''";
        i++;
      } else {
        inString = false;
        result += ch;
      }
    } else if (ch === '?' && !inString) {
      idx++;
      result += `$${idx}`;
    } else {
      result += ch;
    }
  }
  return result;
}

export async function initDatabase(connectionString?: string): Promise<Database> {
  const connStr = connectionString ?? process.env.DATABASE_URL ?? 'postgresql://kanary:kanary@localhost:5432/kanary';

  const pool = new pg.Pool({ connectionString: connStr });

  // Test connection
  const client = await pool.connect();
  try {
    // Run migration
    const migrationPath = resolve(__dirname, 'migrations', '001_init.sql');
    const migrationSql = readFileSync(migrationPath, 'utf-8');
    await client.query(migrationSql);
  } finally {
    client.release();
  }

  const db: Database = {
    async query<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<DbResult<T>> {
      const pgSql = convertParams(sql);
      const result = await pool.query(pgSql, params);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },

    async getOne<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T | undefined> {
      const { rows } = await db.query<T>(sql, ...params);
      return rows[0];
    },

    async getAll<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T[]> {
      const { rows } = await db.query<T>(sql, ...params);
      return rows;
    },

    async run(sql: string, ...params: unknown[]): Promise<DbResult> {
      return db.query(sql, ...params);
    },

    async exec(sql: string): Promise<void> {
      await pool.query(sql);
    },

    async close(): Promise<void> {
      await pool.end();
    },
  };

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
