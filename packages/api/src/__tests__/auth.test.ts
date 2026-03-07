import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import { initDatabase } from '../db.js';
import { authRoutes } from '../routes/auth.js';
import '../types.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  const db = initDatabase(':memory:');
  app.decorate('db', db);
  await app.register(cookie);
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function getCookieValue(res: { cookies: unknown[] }, name: string): string | undefined {
  const cookies = res.cookies as { name: string; value: string }[];
  return cookies.find((c) => c.name === name)?.value;
}

function getCookie(res: { cookies: unknown[] }, name: string) {
  const cookies = res.cookies as { name: string; value: string; httpOnly?: boolean; sameSite?: string; path?: string }[];
  return cookies.find((c) => c.name === name);
}

function authCookieHeader(res: { cookies: unknown[] }): string {
  const access = getCookieValue(res, 'access_token');
  const refresh = getCookieValue(res, 'refresh_token');
  const parts: string[] = [];
  if (access) parts.push(`access_token=${access}`);
  if (refresh) parts.push(`refresh_token=${refresh}`);
  return parts.join('; ');
}

describe('GET /api/auth/status', () => {
  it('returns setupRequired: true when no users exist', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/status' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ setupRequired: true });
  });
});

describe('POST /api/auth/setup', () => {
  it('creates first admin user and sets JWT cookies', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/setup',
      payload: { email: 'admin@test.com', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe('admin@test.com');
    expect(res.json().user.role).toBe('admin');

    const accessCookie = getCookie(res, 'access_token');
    const refreshCookie = getCookie(res, 'refresh_token');
    expect(accessCookie).toBeDefined();
    expect(refreshCookie).toBeDefined();
    expect(accessCookie!.httpOnly).toBe(true);
    expect(refreshCookie!.httpOnly).toBe(true);
    expect(accessCookie!.sameSite).toBe('Lax');
    expect(refreshCookie!.sameSite).toBe('Lax');
    expect(accessCookie!.path).toBe('/');
  });

  it('returns 403 if users already exist', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/setup',
      payload: { email: 'another@test.com', password: 'pass' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatch(/already completed/i);
  });

  it('returns 400 if email or password missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/setup',
      payload: { email: 'no-pass@test.com' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/auth/status after setup', () => {
  it('returns setupRequired: false', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/status' });
    expect(res.json()).toEqual({ setupRequired: false });
  });
});

describe('POST /api/auth/login', () => {
  it('returns user and sets JWT cookies on valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@test.com', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe('admin@test.com');

    expect(getCookieValue(res, 'access_token')).toBeDefined();
    expect(getCookieValue(res, 'refresh_token')).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@test.com', password: 'wrongpass' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatch(/invalid credentials/i);
  });

  it('returns 401 for non-existent user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@test.com', password: 'pass' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 if email or password missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@test.com' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user info when authenticated via access token cookie', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@test.com', password: 'password123' },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: authCookieHeader(loginRes) },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe('admin@test.com');
  });

  it('returns 401 without any cookies', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues a new access token given a valid refresh token', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@test.com', password: 'password123' },
    });
    const refreshCookie = `refresh_token=${getCookieValue(loginRes, 'refresh_token')}`;

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: refreshCookie },
    });
    expect(refreshRes.statusCode).toBe(200);
    expect(getCookieValue(refreshRes, 'access_token')).toBeDefined();
    expect(refreshRes.json().user.email).toBe('admin@test.com');
  });

  it('returns 401 without refresh token', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/refresh' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes refresh token and clears cookies', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@test.com', password: 'password123' },
    });

    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: authCookieHeader(loginRes) },
    });
    expect(logoutRes.statusCode).toBe(200);

    // Refresh token should be revoked — refresh should fail
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: `refresh_token=${getCookieValue(loginRes, 'refresh_token')}` },
    });
    expect(refreshRes.statusCode).toBe(401);
  });
});
