import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { authRoutes } from '../routes/auth.js';
import { userRoutes } from '../routes/users.js';
import { hashPassword } from '../auth/password.js';
import { createTokenPair } from '../auth/session.js';
import type { Database } from '../db.js';
import { createTestDb } from './test-helpers.js';
import '../types.js';

let app: FastifyInstance;
let adminCookie: string;
let adminUserId: number;
let viewerCookie: string;
let db: Database;

beforeAll(async () => {
  db = await createTestDb();
  app = Fastify();
  app.decorate('db', db);
  await app.register(cookie);
  await app.register(rateLimit, { max: 1000, timeWindow: '1 minute' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.ready();

  // Create an admin user
  const adminHash = await hashPassword('adminpass');
  const adminResult = await db.run(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) RETURNING id',
    'admin@test.com', adminHash, 'admin',
  );
  adminUserId = adminResult.rows[0].id as number;
  const adminTokens = await createTokenPair(db, { id: adminUserId, email: 'admin@test.com', role: 'admin' });
  adminCookie = `access_token=${adminTokens.accessToken}; refresh_token=${adminTokens.refreshToken}`;

  // Create a viewer user
  const viewerHash = await hashPassword('viewerpass');
  const viewerResult = await db.run(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) RETURNING id',
    'viewer@test.com', viewerHash, 'viewer',
  );
  const viewerId = viewerResult.rows[0].id as number;
  const viewerTokens = await createTokenPair(db, { id: viewerId, email: 'viewer@test.com', role: 'viewer' });
  viewerCookie = `access_token=${viewerTokens.accessToken}; refresh_token=${viewerTokens.refreshToken}`;
});

afterAll(async () => {
  await app.close();
  await db.close();
});

describe('GET /api/users', () => {
  it('returns user list for admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: { cookie: adminCookie },
    });
    expect(res.statusCode).toBe(200);
    const users = res.json();
    expect(users.length).toBe(2);
    expect(users[0]).toHaveProperty('email');
    expect(users[0]).toHaveProperty('role');
    expect(users[0]).toHaveProperty('created_at');
    expect(users[0]).not.toHaveProperty('password_hash');
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/users' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 for viewer', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: { cookie: viewerCookie },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /api/users', () => {
  it('creates a new user and returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: { cookie: adminCookie },
      payload: { email: 'new@test.com', password: 'Newpass1!', role: 'viewer' },
    });
    expect(res.statusCode).toBe(201);
    const user = res.json();
    expect(user.email).toBe('new@test.com');
    expect(user.role).toBe('viewer');
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('created_at');
    expect(user).not.toHaveProperty('password_hash');
  });

  it('defaults role to viewer when not specified', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: { cookie: adminCookie },
      payload: { email: 'default-role@test.com', password: 'Pass123!' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().role).toBe('viewer');
  });

  it('returns 400 when email is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: { cookie: adminCookie },
      payload: { password: 'Somepass1!' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: { cookie: adminCookie },
      payload: { email: 'nopass@test.com' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid role', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: { cookie: adminCookie },
      payload: { email: 'badrole@test.com', password: 'Pass123!', role: 'superadmin' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 409 for duplicate email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: { cookie: adminCookie },
      payload: { email: 'admin@test.com', password: 'Pass123!' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('returns 403 for viewer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: { cookie: viewerCookie },
      payload: { email: 'blocked@test.com', password: 'Pass123!' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('DELETE /api/users/:id', () => {
  it('prevents deleting yourself', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/users/${adminUserId}`,
      headers: { cookie: adminCookie },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/own account/i);
  });

  it('deletes a user and returns 204', async () => {
    // Create a user to delete
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers: { cookie: adminCookie },
      payload: { email: 'to-delete@test.com', password: 'Pass123!', role: 'viewer' },
    });
    const userId = createRes.json().id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/users/${userId}`,
      headers: { cookie: adminCookie },
    });
    expect(res.statusCode).toBe(204);

    // Verify user is gone
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: { cookie: adminCookie },
    });
    const emails = listRes.json().map((u: { email: string }) => u.email);
    expect(emails).not.toContain('to-delete@test.com');
  });

  it('returns 404 for non-existent user', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/users/99999',
      headers: { cookie: adminCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 403 for viewer', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/users/1',
      headers: { cookie: viewerCookie },
    });
    expect(res.statusCode).toBe(403);
  });
});
