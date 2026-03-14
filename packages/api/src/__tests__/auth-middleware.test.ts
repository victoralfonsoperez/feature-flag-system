import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';
import Fastify, { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { authRoutes } from '../routes/auth.js';
import { flagRoutes } from '../routes/flags.js';
import type { Database } from '../db.js';
import { createTestDb, createTestToken, mockAuth0Verification } from './test-helpers.js';
import '../types.js';

// Must call mockAuth0Verification before tests run
await mockAuth0Verification();

let app: FastifyInstance;
let db: Database;

beforeAll(async () => {
  db = await createTestDb();
  app = Fastify();
  app.decorate('db', db);
  await app.register(rateLimit, { max: 1000, timeWindow: '1 minute' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(flagRoutes, { prefix: '/api/flags' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await db.close();
});

describe('Auth0 token validation', () => {
  it('accepts a valid Auth0 JWT and returns user info', async () => {
    const token = await createTestToken({ email: 'admin@test.com', roles: ['admin'] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.email).toBe('admin@test.com');
    expect(body.user.role).toBe('admin');
    expect(body.user.id).toBe('auth0|test-user-123');
  });

  it('extracts viewer role when user has no admin role', async () => {
    const token = await createTestToken({ email: 'viewer@test.com', roles: ['viewer'] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.role).toBe('viewer');
  });

  it('defaults to viewer when no roles claim', async () => {
    const token = await createTestToken({ email: 'norole@test.com', roles: [] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.role).toBe('viewer');
  });
});

describe('API token fallback', () => {
  let apiTokenPlaintext: string;

  beforeAll(async () => {
    // Insert an API token directly into the database
    apiTokenPlaintext = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(apiTokenPlaintext).digest('hex');
    await db.run(
      'INSERT INTO api_tokens (name, token_hash, created_by, creator_email, creator_role) VALUES (?, ?, ?, ?, ?)',
      'test-token', tokenHash, 'auth0|creator', 'creator@test.com', 'admin',
    );
  });

  it('authenticates via API token when Auth0 verification fails', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${apiTokenPlaintext}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.email).toBe('creator@test.com');
    expect(body.user.role).toBe('admin');
    expect(body.user.id).toBe('auth0|creator');
  });
});

describe('401/403 cases', () => {
  it('returns 401 without any auth header', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Authentication required');
  });

  it('returns 401 with invalid Bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: 'Bearer invalid-token' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('mutating routes require auth', async () => {
    const post = await app.inject({
      method: 'POST',
      url: '/api/flags',
      payload: { key: 'blocked', value: 'x', type: 'runtime' },
    });
    expect(post.statusCode).toBe(401);
  });
});

describe('GET /api/auth/status', () => {
  it('always returns setupRequired: false', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/status' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ setupRequired: false });
  });
});
