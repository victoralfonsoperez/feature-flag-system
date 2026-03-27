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

  const isLocalhost = connStr.includes('localhost') || connStr.includes('127.0.0.1') || connStr.includes('@postgres:');
  const pool = new pg.Pool({
    connectionString: connStr,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
  });

  // Test connection
  const client = await pool.connect();
  try {
    // Run migrations
    const migration001Path = resolve(__dirname, 'migrations', '001_init.sql');
    const migration001Sql = readFileSync(migration001Path, 'utf-8');
    await client.query(migration001Sql);

    const migration002Path = resolve(__dirname, 'migrations', '002_auth0_migration.sql');
    const migration002Sql = readFileSync(migration002Path, 'utf-8');
    await client.query(migration002Sql);

    const migration003Path = resolve(__dirname, 'migrations', '003_token_app_scope.sql');
    const migration003Sql = readFileSync(migration003Path, 'utf-8');
    await client.query(migration003Sql);
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
  created_by: string;
  creator_email: string | null;
  creator_role: string | null;
  last_used_at: string | null;
  created_at: string;
  app_id: string | null;
};
