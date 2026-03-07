import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { initDatabase } from '../db.js';
import { flagRoutes } from '../routes/flags.js';
import type { FlagRow } from '../db.js';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const API_TOKEN = 'test-secret-token';
const auth = { authorization: `Bearer ${API_TOKEN}` };

let app: FastifyInstance;
let dbPath: string;

function seedFlags(app: FastifyInstance) {
  const insert = app.db.prepare(
    `INSERT INTO flags (key, value, type, environment, description, variants)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  const flags = [
    ['enable_dark_mode', 'true', 'runtime', 'production', 'Toggle dark mode', null],
    ['maintenance_mode', 'false', 'runtime', 'production', 'Show maintenance page', null],
    ['enable_signup', 'true', 'runtime', 'staging', 'Allow signups', null],
    ['enable_new_checkout', 'true', 'build-time', 'production', 'New checkout flow', null],
    ['api_base_url', 'https://api.example.com', 'build-time', 'production', 'API base URL', null],
    [
      'cta_button_color',
      'blue',
      'runtime',
      'production',
      'CTA button experiment',
      JSON.stringify([
        { name: 'control', value: 'blue', weight: 50 },
        { name: 'variant_a', value: 'green', weight: 25 },
        { name: 'variant_b', value: 'orange', weight: 25 },
      ]),
    ],
  ];

  const tx = app.db.transaction(() => {
    for (const [key, value, type, environment, description, variants] of flags) {
      insert.run(key, value, type, environment, description, variants);
    }
  });
  tx();

  return flags;
}

beforeAll(async () => {
  process.env.API_TOKEN = API_TOKEN;

  dbPath = path.join(os.tmpdir(), `flags-test-${Date.now()}.db`);
  app = Fastify();
  const db = initDatabase(dbPath);
  app.decorate('db', db);
  await app.register(flagRoutes, { prefix: '/api/flags' });
  await app.ready();

  seedFlags(app);
});

afterAll(async () => {
  await app.close();
  for (const suffix of ['', '-shm', '-wal']) {
    try { fs.unlinkSync(dbPath + suffix); } catch { /* cleanup */ }
  }
});

// ── GET /api/flags ──────────────────────────────────────────────────────

describe('GET /api/flags', () => {
  it('returns all seeded flags', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags' });
    expect(res.statusCode).toBe(200);
    const flags = res.json() as FlagRow[];
    expect(flags.length).toBe(6);
    expect(flags.map((f) => f.key)).toContain('enable_dark_mode');
  });

  it('filters by type', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags?type=build-time' });
    const flags = res.json() as FlagRow[];
    expect(flags.length).toBe(2);
    expect(flags.every((f) => f.type === 'build-time')).toBe(true);
  });

  it('filters by environment', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags?env=staging' });
    const flags = res.json() as FlagRow[];
    expect(flags.length).toBe(1);
    expect(flags[0].key).toBe('enable_signup');
  });

  it('filters by type and environment together', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags?type=runtime&env=production' });
    const flags = res.json() as FlagRow[];
    expect(flags.every((f) => f.type === 'runtime' && f.environment === 'production')).toBe(true);
  });
});

// ── GET /api/flags/:key ─────────────────────────────────────────────────

describe('GET /api/flags/:key', () => {
  it('returns a single flag by key', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags/enable_dark_mode' });
    expect(res.statusCode).toBe(200);
    const flag = res.json() as FlagRow;
    expect(flag.key).toBe('enable_dark_mode');
    expect(flag.value).toBe('true');
    expect(flag.type).toBe('runtime');
  });

  it('returns 404 for missing flag', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags/nonexistent_flag' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('Flag not found');
  });
});

// ── POST /api/flags ─────────────────────────────────────────────────────

describe('POST /api/flags', () => {
  it('creates a new flag and returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: auth,
      payload: { key: 'new_feature', value: 'enabled', type: 'runtime' },
    });
    expect(res.statusCode).toBe(201);
    const flag = res.json() as FlagRow;
    expect(flag.key).toBe('new_feature');
    expect(flag.value).toBe('enabled');
    expect(flag.environment).toBe('production');
  });

  it('rejects duplicate key with 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: auth,
      payload: { key: 'new_feature', value: 'v2', type: 'runtime' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatch(/already exists/);
  });

  it('rejects missing required fields with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: auth,
      payload: { key: 'no_value' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/required/);
  });

  it('rejects invalid key format with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: auth,
      payload: { key: 'invalid key!', value: 'x', type: 'runtime' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/alphanumeric/);
  });

  it('rejects invalid type with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: auth,
      payload: { key: 'bad_type', value: 'x', type: 'invalid' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/type must be/);
  });

  it('rejects invalid environment with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: auth,
      payload: { key: 'bad_env', value: 'x', type: 'runtime', environment: 'invalid' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/environment must be/);
  });
});

// ── PUT /api/flags/:key ─────────────────────────────────────────────────

describe('PUT /api/flags/:key', () => {
  it('updates a flag value', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/flags/enable_dark_mode',
      headers: auth,
      payload: { value: 'false' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().value).toBe('false');
  });

  it('updates flag description without changing value', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/flags/enable_dark_mode',
      headers: auth,
      payload: { description: 'Updated description' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().description).toBe('Updated description');
    expect(res.json().value).toBe('false');
  });

  it('returns 404 for missing flag', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/flags/nonexistent_flag',
      headers: auth,
      payload: { value: 'x' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('Flag not found');
  });
});

// ── DELETE /api/flags/:key ──────────────────────────────────────────────

describe('DELETE /api/flags/:key', () => {
  it('deletes an existing flag and returns 204', async () => {
    // Create a flag to delete
    await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: auth,
      payload: { key: 'to_delete', value: 'bye', type: 'runtime' },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/flags/to_delete',
      headers: auth,
    });
    expect(res.statusCode).toBe(204);

    // Verify it's gone
    const check = await app.inject({ method: 'GET', url: '/api/flags/to_delete' });
    expect(check.statusCode).toBe(404);
  });

  it('returns 404 for missing flag', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/flags/nonexistent_flag',
      headers: auth,
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('Flag not found');
  });
});

// ── Auth middleware blocks mutating routes ───────────────────────────────

describe('auth middleware blocks mutating routes without valid token', () => {
  it('POST returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      payload: { key: 'blocked', value: 'x', type: 'runtime' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('PUT returns 401 without token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/flags/enable_dark_mode',
      payload: { value: 'x' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('DELETE returns 401 without token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/flags/enable_dark_mode',
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST returns 403 with wrong token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      payload: { key: 'blocked2', value: 'x', type: 'runtime' },
      headers: { authorization: 'Bearer wrong' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET routes remain accessible without auth', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/flags' });
    expect(list.statusCode).toBe(200);

    const resolve = await app.inject({ method: 'GET', url: '/api/flags/resolve' });
    expect(resolve.statusCode).toBe(200);
  });
});

// ── GET /api/flags/resolve ──────────────────────────────────────────────

describe('GET /api/flags/resolve', () => {
  it('returns a key-value map of all flags', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags/resolve' });
    expect(res.statusCode).toBe(200);
    const resolved = res.json() as Record<string, string>;
    expect(resolved).toHaveProperty('maintenance_mode', 'false');
    expect(resolved).toHaveProperty('enable_new_checkout', 'true');
  });

  it('filters by type', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags/resolve?type=build-time' });
    const resolved = res.json() as Record<string, string>;
    expect(resolved).toHaveProperty('api_base_url');
    expect(resolved).not.toHaveProperty('maintenance_mode');
  });

  it('filters by environment', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags/resolve?env=staging' });
    const resolved = res.json() as Record<string, string>;
    expect(resolved).toHaveProperty('enable_signup', 'true');
    expect(Object.keys(resolved).length).toBe(1);
  });

  it('resolves A/B variant deterministically with user_id', async () => {
    const res1 = await app.inject({
      method: 'GET',
      url: '/api/flags/resolve?env=production&user_id=user-123',
    });
    const res2 = await app.inject({
      method: 'GET',
      url: '/api/flags/resolve?env=production&user_id=user-123',
    });
    const resolved1 = res1.json() as Record<string, string>;
    const resolved2 = res2.json() as Record<string, string>;

    // Same user_id should produce same variant
    expect(resolved1.cta_button_color).toBe(resolved2.cta_button_color);
    // Variant should be one of the defined values
    expect(['blue', 'green', 'orange']).toContain(resolved1.cta_button_color);
  });

  it('returns default value when no user_id for variant flag', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/flags/resolve?env=production',
    });
    const resolved = res.json() as Record<string, string>;
    expect(resolved.cta_button_color).toBe('blue');
  });
});
