import { FastifyRequest, FastifyReply } from 'fastify';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const API_TOKEN = process.env.API_TOKEN;

  if (!API_TOKEN) {
    request.log.error('API_TOKEN environment variable is not set');
    return reply.status(500).send({ error: 'Server misconfiguration', statusCode: 500 });
  }

  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return reply.status(401).send({ error: 'Missing Authorization header', statusCode: 401 });
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return reply.status(401).send({ error: 'Invalid Authorization format. Use: Bearer <token>', statusCode: 401 });
  }

  const token = match[1];
  if (token !== API_TOKEN) {
    return reply.status(403).send({ error: 'Invalid API token', statusCode: 403 });
  }
}
