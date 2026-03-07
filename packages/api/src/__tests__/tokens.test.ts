import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import { initDatabase } from '../db.js';
import { authRoutes } from '../routes/auth.js';
import { tokenRoutes } from '../routes/tokens.js';
import { flagRoutes } from '../routes/flags.js';
import { hashPassword } from '../auth/password.js';
import { createTokenPair } from '../auth/session.js';
import '../types.js';

let app: FastifyInstance;
let authCookie: string;

beforeAll(async () => {
  app = Fastify();
  const db = initDatabase(':memory:');
  app.decorate('db', db);
  await app.register(cookie);
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(tokenRoutes, { prefix: '/api/tokens' });
  await app.register(flagRoutes, { prefix: '/api/flags' });
  await app.ready();

  // Create a test user with JWT tokens
  const passwordHash = await hashPassword('testpass');
  const result = db
    .prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)')
    .run('tokenuser@test.com', passwordHash, 'admin');
  const userId = result.lastInsertRowid as number;
  const tokens = createTokenPair(db, { id: userId, email: 'tokenuser@test.com', role: 'admin' });
  authCookie = `access_token=${tokens.accessToken}; refresh_token=${tokens.refreshToken}`;
});

afterAll(async () => {
  await app.close();
});

describe('GET /api/tokens', () => {
  it('returns empty list initially', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/tokens',
      headers: { cookie: authCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tokens' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/tokens', () => {
  let createdToken: string;
  let tokenId: number;

  it('creates a token and returns plaintext once', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tokens',
      headers: { cookie: authCookie },
      payload: { name: 'CI Token' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe('CI Token');
    expect(body.token).toBeDefined();
    expect(body.token.length).toBe(64); // 32 bytes hex
    createdToken = body.token;
    tokenId = body.id;
  });

  it('returns 400 without name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tokens',
      headers: { cookie: authCookie },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('lists created token (without hash)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/tokens',
      headers: { cookie: authCookie },
    });
    const tokens = res.json();
    expect(tokens.length).toBe(1);
    expect(tokens[0].name).toBe('CI Token');
    expect(tokens[0].token_hash).toBeUndefined();
    expect(tokens[0].token).toBeUndefined();
  });

  it('can authenticate with created API token via Bearer header', async () => {
    // Seed a flag first
    await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: { cookie: authCookie },
      payload: { key: 'token_test_flag', value: 'yes', type: 'runtime' },
    });

    // Use the API token to update the flag
    const res = await app.inject({
      method: 'PUT',
      url: '/api/flags/token_test_flag',
      headers: { authorization: `Bearer ${createdToken}` },
      payload: { value: 'updated-via-token' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().value).toBe('updated-via-token');
  });

  it('rejects invalid Bearer token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/flags/token_test_flag',
      headers: { authorization: 'Bearer invalid-token-value' },
      payload: { value: 'nope' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('deletes a token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/tokens/${tokenId}`,
      headers: { cookie: authCookie },
    });
    expect(res.statusCode).toBe(204);

    // Verify it's gone
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/tokens',
      headers: { cookie: authCookie },
    });
    expect(listRes.json()).toEqual([]);
  });

  it('returns 404 when deleting non-existent token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/tokens/99999',
      headers: { cookie: authCookie },
    });
    expect(res.statusCode).toBe(404);
  });
});
