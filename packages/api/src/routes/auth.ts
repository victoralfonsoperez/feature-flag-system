import rateLimit from '@fastify/rate-limit';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import '../types.js';

export async function authRoutes(app: FastifyInstance) {
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  // GET /api/auth/status — backward compat: setup is never required with Auth0
  app.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ setupRequired: false });
  });

  // GET /api/auth/me — get current user from Auth0 token claims
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
