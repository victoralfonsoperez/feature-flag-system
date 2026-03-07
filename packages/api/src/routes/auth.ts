import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { hashPassword, verifyPassword } from '../auth/password.js';
import {
  createTokenPair,
  revokeRefreshToken,
  revokeAllUserSessions,
  cleanExpiredSessions,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
} from '../auth/session.js';
import { verifyJwt, decodeJwt, signJwt } from '../auth/jwt.js';
import { validateRefreshToken } from '../auth/session.js';
import { requireAuth } from '../middleware/auth.js';
import type { UserRow } from '../db.js';
import '../types.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
};

function setAuthCookies(
  reply: FastifyReply,
  tokens: { accessToken: string; refreshToken: string },
): FastifyReply {
  return reply
    .setCookie('access_token', tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_TTL,
    })
    .setCookie('refresh_token', tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_TTL,
    });
}

function clearAuthCookies(reply: FastifyReply): FastifyReply {
  return reply
    .clearCookie('access_token', { path: '/' })
    .clearCookie('refresh_token', { path: '/' });
}

export async function authRoutes(app: FastifyInstance) {
  // GET /api/auth/status — check if setup is needed
  app.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const count = app.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    return reply.send({ setupRequired: count.count === 0 });
  });

  // POST /api/auth/setup — create first admin user
  app.post('/setup', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email?: string; password?: string };

    if (!email || !password) {
      return reply.status(400).send({ error: 'email and password are required', statusCode: 400 });
    }

    const count = app.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (count.count > 0) {
      return reply.status(403).send({ error: 'Setup already completed', statusCode: 403 });
    }

    const passwordHash = await hashPassword(password);
    const result = app.db
      .prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)')
      .run(email, passwordHash, 'admin');

    const userId = result.lastInsertRowid as number;

    cleanExpiredSessions(app.db);
    const tokens = createTokenPair(app.db, { id: userId, email, role: 'admin' });

    return setAuthCookies(reply, tokens)
      .send({ user: { id: userId, email, role: 'admin' } });
  });

  // POST /api/auth/login — authenticate and issue tokens
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email?: string; password?: string };

    if (!email || !password) {
      return reply.status(400).send({ error: 'email and password are required', statusCode: 400 });
    }

    const user = app.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
      | UserRow
      | undefined;

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return reply.status(401).send({ error: 'Invalid credentials', statusCode: 401 });
    }

    cleanExpiredSessions(app.db);
    const tokens = createTokenPair(app.db, { id: user.id, email: user.email, role: user.role });

    return setAuthCookies(reply, tokens)
      .send({ user: { id: user.id, email: user.email, role: user.role } });
  });

  // POST /api/auth/refresh — exchange refresh token for new access token
  app.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies?.refresh_token;
    if (!refreshToken) {
      return reply.status(401).send({ error: 'No refresh token', statusCode: 401 });
    }

    const payload = verifyJwt(refreshToken);
    if (!payload || !payload.jti) {
      return reply.status(401).send({ error: 'Invalid refresh token', statusCode: 401 });
    }

    if (!validateRefreshToken(app.db, payload.jti)) {
      return reply.status(401).send({ error: 'Refresh token revoked or expired', statusCode: 401 });
    }

    const newAccessToken = signJwt(
      { sub: payload.sub, email: payload.email, role: payload.role },
      ACCESS_TOKEN_TTL,
    );

    return reply
      .setCookie('access_token', newAccessToken, {
        ...COOKIE_OPTIONS,
        maxAge: ACCESS_TOKEN_TTL,
      })
      .send({ user: { id: payload.sub, email: payload.email, role: payload.role } });
  });

  // POST /api/auth/logout — revoke refresh token, clear cookies
  app.post('/logout', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies?.refresh_token;
    if (refreshToken) {
      const payload = decodeJwt(refreshToken);
      if (payload?.jti) {
        revokeRefreshToken(app.db, payload.jti);
      }
    }

    return clearAuthCookies(reply).send({ success: true });
  });

  // GET /api/auth/me — get current user
  app.get('/me', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      user: {
        id: request.user!.id,
        email: request.user!.email,
        role: request.user!.role,
      },
    });
  });
}
