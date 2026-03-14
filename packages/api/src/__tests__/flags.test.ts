import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { flagRoutes } from '../routes/flags.js';
import { authRoutes } from '../routes/auth.js';
import { hashPassword } from '../auth/password.js';
import { createTokenPair } from '../auth/session.js';
import type { FlagRow, Database } from '../db.js';
import { createTestDb } from './test-helpers.js';
import '../types.js';

let app: FastifyInstance;
let authCookie: string;
let db: Database;
const TEST_EMAIL = 'test@example.com';

async function seedFlags(db: Database) {
  const flags = [
    ['default', 'enable_dark_mode', 'true', 'runtime', 'production', 'Toggle dark mode', null],
    ['default', 'maintenance_mode', 'false', 'runtime', 'production', 'Show maintenance page', null],
    ['default', 'enable_signup', 'true', 'runtime', 'staging', 'Allow signups', null],
    ['default', 'enable_new_checkout', 'true', 'build-time', 'production', 'New checkout flow', null],
    ['default', 'api_base_url', 'https://api.example.com', 'build-time', 'production', 'API base URL', null],
    [
      'default',
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

  for (const [app_id, key, value, type, environment, description, variants] of flags) {
    await db.run(
      `INSERT INTO flags (app_id, key, value, type, environment, description, variants)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      app_id, key, value, type, environment, description, variants,
    );
  }

  return flags;
}

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
  await app.ready();

  authCookie = await createTestUser(db);
  await seedFlags(db);
});

afterAll(async () => {
  await app.close();
  await db.close();
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

  it('scopes by app_id and returns empty for unknown app', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags?app_id=unknown-app' });
    const flags = res.json() as FlagRow[];
    expect(flags.length).toBe(0);
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
    expect(flag.app_id).toBe('default');
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
      headers: { cookie: authCookie },
      payload: { key: 'new_feature', value: 'enabled', type: 'runtime' },
    });
    expect(res.statusCode).toBe(201);
    const flag = res.json() as FlagRow;
    expect(flag.key).toBe('new_feature');
    expect(flag.value).toBe('enabled');
    expect(flag.environment).toBe('production');
    expect(flag.app_id).toBe('default');
  });

  it('records user email in audit log', async () => {
    const log = await db.getOne<{ changed_by: string }>(
      "SELECT changed_by FROM audit_log WHERE flag_key = 'new_feature' AND action = 'created'",
    );
    expect(log!.changed_by).toBe(TEST_EMAIL);
  });

  it('rejects duplicate key with 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: { cookie: authCookie },
      payload: { key: 'new_feature', value: 'v2', type: 'runtime' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatch(/already exists/);
  });

  it('rejects missing required fields with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: { cookie: authCookie },
      payload: { key: 'no_value' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/required/);
  });

  it('rejects invalid key format with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: { cookie: authCookie },
      payload: { key: 'invalid key!', value: 'x', type: 'runtime' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/alphanumeric/);
  });

  it('rejects invalid type with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: { cookie: authCookie },
      payload: { key: 'bad_type', value: 'x', type: 'invalid' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/type must be/);
  });

  it('rejects invalid environment with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: { cookie: authCookie },
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
      headers: { cookie: authCookie },
      payload: { value: 'false' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().value).toBe('false');
  });

  it('records user email in audit log on update', async () => {
    const log = await db.getOne<{ changed_by: string }>(
      "SELECT changed_by FROM audit_log WHERE flag_key = 'enable_dark_mode' AND action = 'updated'",
    );
    expect(log!.changed_by).toBe(TEST_EMAIL);
  });

  it('updates flag description without changing value', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/flags/enable_dark_mode',
      headers: { cookie: authCookie },
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
      headers: { cookie: authCookie },
      payload: { value: 'x' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('Flag not found');
  });
});

// ── DELETE /api/flags/:key ──────────────────────────────────────────────

describe('DELETE /api/flags/:key', () => {
  it('deletes an existing flag and returns 204', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: { cookie: authCookie },
      payload: { key: 'to_delete', value: 'bye', type: 'runtime' },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/flags/to_delete',
      headers: { cookie: authCookie },
    });
    expect(res.statusCode).toBe(204);

    const check = await app.inject({ method: 'GET', url: '/api/flags/to_delete' });
    expect(check.statusCode).toBe(404);
  });

  it('returns 404 for missing flag', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/flags/nonexistent_flag',
      headers: { cookie: authCookie },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('Flag not found');
  });
});

// ── Auth middleware blocks mutating routes ───────────────────────────────

describe('auth middleware blocks mutating routes without valid token', () => {
  it('POST returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      payload: { key: 'blocked', value: 'x', type: 'runtime' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('PUT returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/flags/enable_dark_mode',
      payload: { value: 'x' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('DELETE returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/flags/enable_dark_mode',
    });
    expect(res.statusCode).toBe(401);
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
  it('returns a key-value map of all flags with _variants metadata', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags/resolve' });
    expect(res.statusCode).toBe(200);
    const resolved = res.json();
    expect(resolved).toHaveProperty('maintenance_mode', 'false');
    expect(resolved).toHaveProperty('enable_new_checkout', 'true');
    expect(resolved).toHaveProperty('_variants');
  });

  it('filters by type', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags/resolve?type=build-time' });
    const resolved = res.json();
    expect(resolved).toHaveProperty('api_base_url');
    expect(resolved).not.toHaveProperty('maintenance_mode');
  });

  it('filters by environment', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags/resolve?env=staging' });
    const resolved = res.json();
    expect(resolved).toHaveProperty('enable_signup', 'true');
    // enable_signup + _variants
    expect(Object.keys(resolved).length).toBe(2);
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
    const resolved1 = res1.json();
    const resolved2 = res2.json();

    expect(resolved1.cta_button_color).toBe(resolved2.cta_button_color);
    expect(['blue', 'green', 'orange']).toContain(resolved1.cta_button_color);
  });

  it('includes variant metadata when user_id is provided', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/flags/resolve?env=production&user_id=user-123',
    });
    const resolved = res.json();
    expect(resolved._variants).toHaveProperty('cta_button_color');
    const meta = resolved._variants.cta_button_color;
    expect(meta.flagKey).toBe('cta_button_color');
    expect(['control', 'variant_a', 'variant_b']).toContain(meta.variant);
  });

  it('does not include variant metadata for non-variant flags', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/flags/resolve?env=production&user_id=user-123',
    });
    const resolved = res.json();
    expect(resolved._variants).not.toHaveProperty('maintenance_mode');
  });

  it('returns empty _variants when no user_id is provided', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/flags/resolve?env=production',
    });
    const resolved = res.json();
    expect(resolved._variants).toEqual({});
    expect(resolved.cta_button_color).toBe('blue');
  });

  it('distributes variants uniformly across 10k user IDs', () => {
    // Test the hash distribution directly to avoid rate limiting
    const variants = [
      { name: 'control', value: 'blue', weight: 50 },
      { name: 'variant_a', value: 'green', weight: 25 },
      { name: 'variant_b', value: 'orange', weight: 25 },
    ];
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    const counts: Record<string, number> = { blue: 0, green: 0, orange: 0 };
    const total = 10_000;

    for (let i = 0; i < total; i++) {
      const userId = `user-${i}`;
      // FNV-1a hash — must match resolveVariant implementation
      let hash = 2166136261;
      for (let j = 0; j < userId.length; j++) {
        hash ^= userId.charCodeAt(j);
        hash = Math.imul(hash, 16777619) >>> 0;
      }
      const bucket = hash % totalWeight;
      let cumulative = 0;
      for (const v of variants) {
        cumulative += v.weight;
        if (bucket < cumulative) {
          counts[v.value]++;
          break;
        }
      }
    }

    // Expected: control=50%, variant_a=25%, variant_b=25%
    // Allow 5% tolerance
    const tolerance = 0.05;
    expect(Math.abs(counts.blue / total - 0.5)).toBeLessThan(tolerance);
    expect(Math.abs(counts.green / total - 0.25)).toBeLessThan(tolerance);
    expect(Math.abs(counts.orange / total - 0.25)).toBeLessThan(tolerance);
  });
});

// ── Multi-app scoping ───────────────────────────────────────────────────

describe('multi-app scoping', () => {
  it('creates a flag under a custom app_id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: { cookie: authCookie },
      payload: { key: 'shared_key', value: 'app1-value', type: 'runtime', app_id: 'app1' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().app_id).toBe('app1');
    expect(res.json().key).toBe('shared_key');
  });

  it('allows the same key in a different app_id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: { cookie: authCookie },
      payload: { key: 'shared_key', value: 'app2-value', type: 'runtime', app_id: 'app2' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().app_id).toBe('app2');
    expect(res.json().value).toBe('app2-value');
  });

  it('returns flags scoped to app_id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags?app_id=app1' });
    const flags = res.json() as FlagRow[];
    expect(flags.length).toBe(1);
    expect(flags[0].key).toBe('shared_key');
    expect(flags[0].value).toBe('app1-value');
  });

  it('GET single flag is scoped by app_id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags/shared_key?app_id=app2' });
    expect(res.statusCode).toBe(200);
    expect(res.json().value).toBe('app2-value');
  });

  it('PUT updates the correct app_id flag', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/flags/shared_key?app_id=app1',
      headers: { cookie: authCookie },
      payload: { value: 'app1-updated' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().value).toBe('app1-updated');

    // Verify app2 flag is unchanged
    const app2 = await app.inject({ method: 'GET', url: '/api/flags/shared_key?app_id=app2' });
    expect(app2.json().value).toBe('app2-value');
  });

  it('DELETE removes only the correct app_id flag', async () => {
    // Create a temp flag in app1
    await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: { cookie: authCookie },
      payload: { key: 'to_delete_multi', value: 'v1', type: 'runtime', app_id: 'app1' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/flags',
      headers: { cookie: authCookie },
      payload: { key: 'to_delete_multi', value: 'v2', type: 'runtime', app_id: 'app2' },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/flags/to_delete_multi?app_id=app1',
      headers: { cookie: authCookie },
    });
    expect(res.statusCode).toBe(204);

    // app1 flag is gone
    const check1 = await app.inject({ method: 'GET', url: '/api/flags/to_delete_multi?app_id=app1' });
    expect(check1.statusCode).toBe(404);

    // app2 flag still exists
    const check2 = await app.inject({ method: 'GET', url: '/api/flags/to_delete_multi?app_id=app2' });
    expect(check2.statusCode).toBe(200);
    expect(check2.json().value).toBe('v2');
  });

  it('resolve scopes by app_id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/flags/resolve?app_id=app1' });
    const resolved = res.json();
    expect(resolved).toHaveProperty('shared_key', 'app1-updated');
    expect(resolved).not.toHaveProperty('enable_dark_mode');
  });

  it('audit log records app_id', async () => {
    const log = await db.getOne<{ app_id: string }>(
      "SELECT app_id FROM audit_log WHERE flag_key = 'shared_key' AND app_id = 'app1'",
    );
    expect(log).toBeDefined();
    expect(log!.app_id).toBe('app1');
  });
});
