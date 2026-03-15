import { createHash } from 'node:crypto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAuth0Token } from '../auth/auth0.js';
import type { ApiTokenRow } from '../db.js';
import '../types.js';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const db = request.server.db;

  const authHeader = request.headers.authorization;
  if (authHeader) {
    const prefix = authHeader.substring(0, 7);
    if (prefix.toLowerCase() === 'bearer ') {
      const token = authHeader.substring(7).trim();

      // Strategy 1: Auth0 JWT (RS256)
      const claims = await verifyAuth0Token(token);
      if (claims) {
        const role = claims.roles.includes('admin') ? 'admin' : 'viewer';
        request.user = { id: claims.sub, email: claims.email, role, source: 'auth0' };
        return;
      }

      // Strategy 2: API token (SHA256 hash lookup)
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const row = await db.getOne<
        Pick<ApiTokenRow, 'id' | 'created_by' | 'creator_email' | 'creator_role' | 'app_id'>
      >(
        `SELECT id, created_by, creator_email, creator_role, app_id
         FROM api_tokens
         WHERE token_hash = ?`,
        tokenHash,
      );

      if (row) {
        await db.run("UPDATE api_tokens SET last_used_at = NOW() WHERE id = ?", row.id);
        request.user = {
          id: row.created_by,
          email: row.creator_email || '',
          role: row.creator_role || 'viewer',
          source: 'api-token',
          appId: row.app_id ?? undefined,
        };
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
