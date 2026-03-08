import { randomBytes, createHash } from 'node:crypto';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import type { ApiTokenRow } from '../db.js';
import '../types.js';

export async function tokenRoutes(app: FastifyInstance) {
  // All token routes require auth
  app.addHook('preHandler', requireAuth);

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
