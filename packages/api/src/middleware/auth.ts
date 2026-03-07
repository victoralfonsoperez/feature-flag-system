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
    // Decode ignoring expiry to read claims, then check refresh token hasn't expired
    const payload = decodeJwt(refreshToken);
    if (payload && payload.jti) {
      // The refresh JWT itself must not be expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp > now && validateRefreshToken(db, payload.jti)) {
        // Issue a fresh access token
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
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      const tokenHash = createHash('sha256').update(match[1]).digest('hex');
      const row = db
        .prepare(
          `SELECT t.id as token_id, t.created_by, u.id, u.email, u.role
           FROM api_tokens t JOIN users u ON t.created_by = u.id
           WHERE t.token_hash = ?`,
        )
        .get(tokenHash) as
        | (Pick<ApiTokenRow, 'created_by'> & Pick<UserRow, 'id' | 'email' | 'role'> & { token_id: number })
        | undefined;

      if (row) {
        db.prepare("UPDATE api_tokens SET last_used_at = datetime('now') WHERE id = ?").run(
          row.token_id,
        );
        request.user = { id: row.id, email: row.email, role: row.role, source: 'api-token' };
        return;
      }
    }
  }

  return reply.status(401).send({ error: 'Authentication required', statusCode: 401 });
}
