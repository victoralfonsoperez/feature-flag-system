import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { initDatabase } from '../db.js';
import { flagRoutes } from '../routes/flags.js';

const API_TOKEN = 'test-secret-token';

let app: FastifyInstance;

beforeAll(async () => {
  process.env.API_TOKEN = API_TOKEN;

  app = Fastify();
  const db = initDatabase(':memory:');
  app.decorate('db', db);
  await app.register(flagRoutes, { prefix: '/api/flags' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('GET routes allow unauthenticated access', () => {
  it('GET /api/flags returns 200 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags' });
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/flags/resolve returns 200 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags/resolve' });
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/flags/:key returns 404 without auth (not 401)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags/nonexistent' });
    expect(res.statusCode).toBe(404);
  });
});

describe('mutating routes require auth', () => {
  const flag = { key: 'test-flag', value: 'on', type: 'runtime' };

  it('POST returns 401 without auth header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      payload: flag,
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatch(/Missing Authorization/);
  });

  it('POST returns 401 with malformed auth header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      payload: flag,
      headers: { authorization: 'Basic abc123' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST returns 403 with invalid token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      payload: flag,
      headers: { authorization: 'Bearer wrong-token' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST returns 201 with valid token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      payload: flag,
      headers: { authorization: `Bearer ${API_TOKEN}` },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().key).toBe('test-flag');
  });

  it('PUT returns 401 without auth header', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/flags/test-flag',
      payload: { value: 'off' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('PUT returns 200 with valid token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/flags/test-flag',
      payload: { value: 'off' },
      headers: { authorization: `Bearer ${API_TOKEN}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().value).toBe('off');
  });

  it('DELETE returns 401 without auth header', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/flags/test-flag',
    });
    expect(res.statusCode).toBe(401);
  });

  it('DELETE returns 204 with valid token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/flags/test-flag',
      headers: { authorization: `Bearer ${API_TOKEN}` },
    });
    expect(res.statusCode).toBe(204);
  });
});

describe('audit log records changed_by', () => {
  it('sets changed_by to api-token on create', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/flags',
      payload: { key: 'audit-test', value: 'v1', type: 'runtime' },
      headers: { authorization: `Bearer ${API_TOKEN}` },
    });

    const row = app.db
      .prepare('SELECT changed_by FROM audit_log WHERE flag_key = ?')
      .get('audit-test') as { changed_by: string };

    expect(row.changed_by).toBe('api-token');
  });
});
