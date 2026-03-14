import { createHash } from 'node:crypto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyJwt, decodeJwt, signJwt } from '../auth/jwt.js';
import { validateRefreshToken, ACCESS_TOKEN_TTL } from '../auth/session.js';
import type { ApiTokenRow, UserRow } from '../db.js';
import '../types.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
};

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const db = request.server.db;

  // Strategy 1: Access token JWT cookie
  const accessToken = request.cookies?.access_token;
  if (accessToken) {
    const payload = verifyJwt(accessToken);
    if (payload) {
      request.user = { id: payload.sub, email: payload.email, role: payload.role, source: 'session' };
      return;
    }
  }

  // Strategy 2: Transparent refresh — access token expired but refresh token valid
  const refreshToken = request.cookies?.refresh_token;
  if (refreshToken) {
    const payload = decodeJwt(refreshToken);
    if (payload && payload.jti) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp > now && await validateRefreshToken(db, payload.jti)) {
        const newAccessToken = signJwt(
          { sub: payload.sub, email: payload.email, role: payload.role },
          ACCESS_TOKEN_TTL,
        );
        reply.setCookie('access_token', newAccessToken, {
          ...COOKIE_OPTIONS,
          maxAge: ACCESS_TOKEN_TTL,
        });
        request.user = { id: payload.sub, email: payload.email, role: payload.role, source: 'session' };
        return;
      }
    }
  }

  // Strategy 3: Bearer API token
  const authHeader = request.headers.authorization;
  if (authHeader) {
    const prefix = authHeader.substring(0, 7);
    if (prefix.toLowerCase() === 'bearer ') {
      const token = authHeader.substring(7).trim();
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const row = await db.getOne<
        Pick<ApiTokenRow, 'created_by'> & Pick<UserRow, 'id' | 'email' | 'role'> & { token_id: number }
      >(
        `SELECT t.id as token_id, t.created_by, u.id, u.email, u.role
         FROM api_tokens t JOIN users u ON t.created_by = u.id
         WHERE t.token_hash = ?`,
        tokenHash,
      );

      if (row) {
        await db.run("UPDATE api_tokens SET last_used_at = NOW() WHERE id = ?",
          row.token_id,
        );
        request.user = { id: row.id, email: row.email, role: row.role, source: 'api-token' };
        return;
      }
    }
  }

  return reply.status(401).send({ error: 'Authentication required', statusCode: 401 });
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (request.user?.role !== 'admin') {
    return reply.status(403).send({ error: 'Admin access required', statusCode: 403 });
  }
}
