import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { flagRoutes } from '../routes/flags';
import { authRoutes } from '../routes/auth';
import { auditLogRoutes } from '../routes/audit-log';
import { hashPassword } from '../auth/password';
import { createTokenPair } from '../auth/session';
import type { AuditLogRow, Database } from '../db';
import { createTestDb } from './test-helpers';
import '../types';

let app: FastifyInstance;
let authCookie: string;
let db: Database;
const TEST_EMAIL = 'test@example.com';

async function createTestUser(db: Database): Promise<string> {
  const passwordHash = await hashPassword('testpass123');
  const result = await db.run(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) RETURNING id',
    TEST_EMAIL, passwordHash, 'admin',
  );
  const userId = result.rows[0].id as number;
  const tokens = await createTokenPair(db, { id: userId, email: TEST_EMAIL, role: 'admin' });
  return `access_token=${tokens.accessToken}; refresh_token=${tokens.refreshToken}`;
}

beforeAll(async () => {
  db = await createTestDb();
  app = Fastify();
  app.decorate('db', db);
  await app.register(cookie);
  await app.register(rateLimit, { max: 1000, timeWindow: '1 minute' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(flagRoutes, { prefix: '/api/flags' });
  await app.register(auditLogRoutes, { prefix: '/api/audit-log' });
  await app.ready();

  authCookie = await createTestUser(db);
});

afterAll(async () => {
  await app.close();
  await db.close();
});

describe('GET /api/audit-log', () => {
  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/audit-log' });
    expect(res.statusCode).toBe(401);
  });

  it('returns audit entries after flag mutations', async () => {
    // Create a flag
    await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: { cookie: authCookie },
      payload: { key: 'audit_test', value: 'on', type: 'runtime' },
    });

    // Update the flag
    await app.inject({
      method: 'PUT',
      url: '/api/flags/audit_test',
      headers: { cookie: authCookie },
      payload: { value: 'off' },
    });

    // Delete the flag
    await app.inject({
      method: 'DELETE',
      url: '/api/flags/audit_test',
      headers: { cookie: authCookie },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/audit-log',
      headers: { cookie: authCookie },
    });

    expect(res.statusCode).toBe(200);
    const entries = res.json() as AuditLogRow[];
    expect(entries.length).toBeGreaterThanOrEqual(3);

    // Most recent first
    const actions = entries
      .filter((e) => e.flag_key === 'audit_test')
      .map((e) => e.action);
    expect(actions).toEqual(['deleted', 'updated', 'created']);
  });

  it('filters by flag_key', async () => {
    // Create another flag to have multiple keys
    await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: { cookie: authCookie },
      payload: { key: 'other_flag', value: 'yes', type: 'runtime' },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/audit-log?flag_key=other_flag',
      headers: { cookie: authCookie },
    });

    expect(res.statusCode).toBe(200);
    const entries = res.json() as AuditLogRow[];
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries.every((e) => e.flag_key === 'other_flag')).toBe(true);
  });

  it('supports pagination with limit and offset', async () => {
    const res1 = await app.inject({
      method: 'GET',
      url: '/api/audit-log?limit=2&offset=0',
      headers: { cookie: authCookie },
    });
    const entries1 = res1.json() as AuditLogRow[];
    expect(entries1.length).toBe(2);

    const res2 = await app.inject({
      method: 'GET',
      url: '/api/audit-log?limit=2&offset=2',
      headers: { cookie: authCookie },
    });
    const entries2 = res2.json() as AuditLogRow[];
    expect(entries2.length).toBeGreaterThanOrEqual(1);

    // Different entries
    expect(entries1[0].id).not.toBe(entries2[0].id);
  });
});
