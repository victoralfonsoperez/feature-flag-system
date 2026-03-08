import { randomBytes, createHash } from 'node:crypto';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import type { ApiTokenRow } from '../db.js';
import '../types.js';

export async function tokenRoutes(app: FastifyInstance) {
  // All token routes require auth
  app.addHook('preHandler', requireAuth);

  // Simple in-memory rate limiting for token routes (per user)
  const tokenRateLimitWindowMs = 60_000; // 1 minute
  const tokenRateLimitMaxRequests = 60; // max 60 requests per window per user
  const tokenRateLimitState = new Map<number, { count: number; resetAt: number }>();

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // requireAuth runs first and ensures request.user is defined
    const userId = request.user!.id as number;
    const now = Date.now();

    const existing = tokenRateLimitState.get(userId);
    if (!existing || now >= existing.resetAt) {
      tokenRateLimitState.set(userId, {
        count: 1,
        resetAt: now + tokenRateLimitWindowMs,
      });
      return;
    }

    if (existing.count >= tokenRateLimitMaxRequests) {
      const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
      reply.header('Retry-After', String(retryAfterSeconds));
      return reply.status(429).send({
        error: 'Too Many Requests',
        statusCode: 429,
      });
    }

    existing.count += 1;
    tokenRateLimitState.set(userId, existing);
  });

  // GET /api/tokens — list current user's tokens
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tokens = app.db
      .prepare(
        'SELECT id, name, created_at, last_used_at FROM api_tokens WHERE created_by = ? ORDER BY created_at DESC',
      )
      .all(request.user!.id) as Pick<ApiTokenRow, 'id' | 'name' | 'created_at' | 'last_used_at'>[];

    return reply.send(tokens);
  });

  // POST /api/tokens — create a new API token
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name } = request.body as { name?: string };

    if (!name) {
      return reply.status(400).send({ error: 'name is required', statusCode: 400 });
    }

    const plaintext = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(plaintext).digest('hex');

    const result = app.db
      .prepare('INSERT INTO api_tokens (name, token_hash, created_by) VALUES (?, ?, ?)')
      .run(name, tokenHash, request.user!.id);

    return reply.status(201).send({
      id: result.lastInsertRowid,
      name,
      token: plaintext,
    });
  });

  // DELETE /api/tokens/:id — revoke a token
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const result = app.db
      .prepare('DELETE FROM api_tokens WHERE id = ? AND created_by = ?')
      .run(Number(id), request.user!.id);

    if (result.changes === 0) {
      return reply.status(404).send({ error: 'Token not found', statusCode: 404 });
    }

    return reply.status(204).send();
  });
}
