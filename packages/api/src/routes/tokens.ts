import { randomBytes, createHash } from 'node:crypto';
import rateLimit from '@fastify/rate-limit';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import type { ApiTokenRow } from '../db.js';
import '../types.js';

export async function tokenRoutes(app: FastifyInstance) {
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  // All token routes require auth
  app.addHook('preHandler', requireAuth);

  // GET /api/tokens — list current user's tokens
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tokens = await app.db.getAll<Pick<ApiTokenRow, 'id' | 'name' | 'created_at' | 'last_used_at' | 'app_id'>>(
      'SELECT id, name, created_at, last_used_at, app_id FROM api_tokens WHERE created_by = ? ORDER BY created_at DESC',
      request.user!.id,
    );

    return reply.send(tokens);
  });

  // POST /api/tokens — create a new API token
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, app_id } = request.body as { name?: string; app_id?: string };

    if (!name) {
      return reply.status(400).send({ error: 'name is required', statusCode: 400 });
    }

    const plaintext = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(plaintext).digest('hex');

    const result = await app.db.run(
      'INSERT INTO api_tokens (name, token_hash, created_by, creator_email, creator_role, app_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      name, tokenHash, request.user!.id, request.user!.email, request.user!.role, app_id ?? null,
    );

    return reply.status(201).send({
      id: result.rows[0].id,
      name,
      token: plaintext,
      app_id: app_id ?? null,
    });
  });

  // DELETE /api/tokens/:id — revoke a token
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const result = await app.db.run(
      'DELETE FROM api_tokens WHERE id = ? AND created_by = ?',
      Number(id), request.user!.id,
    );

    if (result.rowCount === 0) {
      return reply.status(404).send({ error: 'Token not found', statusCode: 404 });
    }

    return reply.status(204).send();
  });
}
