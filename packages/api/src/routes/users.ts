import rateLimit from '@fastify/rate-limit';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { hashPassword } from '../auth/password.js';
import type { UserRow } from '../db.js';
import '../types.js';

const adminRouteConfig = {
  config: {
    rateLimit: {
      max: 100,
      timeWindow: '1 minute',
    },
  },
  preHandler: [requireAuth, requireAdmin],
};

export async function userRoutes(app: FastifyInstance) {
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  // GET /api/users — list all users
  app.get('/', adminRouteConfig, async (_request: FastifyRequest, reply: FastifyReply) => {
    const users = await app.db.getAll<Pick<UserRow, 'id' | 'email' | 'role' | 'created_at'>>(
      'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC',
    );

    return reply.send(users);
  });

  // POST /api/users — create a new user
  app.post('/', adminRouteConfig, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, role } = request.body as {
      email?: string;
      password?: string;
      role?: string;
    };

    if (!email || !password) {
      return reply.status(400).send({ error: 'email and password are required', statusCode: 400 });
    }

    if (role && role !== 'admin' && role !== 'viewer') {
      return reply
        .status(400)
        .send({ error: "role must be 'admin' or 'viewer'", statusCode: 400 });
    }

    const existing = await app.db.getOne<Pick<UserRow, 'id'>>(
      'SELECT id FROM users WHERE email = ?',
      email,
    );

    if (existing) {
      return reply.status(409).send({ error: 'A user with this email already exists', statusCode: 409 });
    }

    const passwordHash = await hashPassword(password);
    const userRole = role ?? 'viewer';

    const result = await app.db.run(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) RETURNING id',
      email, passwordHash, userRole,
    );

    const created = await app.db.getOne<Pick<UserRow, 'id' | 'email' | 'role' | 'created_at'>>(
      'SELECT id, email, role, created_at FROM users WHERE id = ?',
      result.rows[0].id,
    );

    return reply.status(201).send(created);
  });

  // DELETE /api/users/:id — delete a user
  app.delete('/:id', adminRouteConfig, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = Number(id);

    if (userId === request.user!.id) {
      return reply.status(400).send({ error: 'Cannot delete your own account', statusCode: 400 });
    }

    const result = await app.db.run('DELETE FROM users WHERE id = ?', userId);

    if (result.rowCount === 0) {
      return reply.status(404).send({ error: 'User not found', statusCode: 404 });
    }

    return reply.status(204).send();
  });
}
