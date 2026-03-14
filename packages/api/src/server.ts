import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { initDatabase } from './db.js';
import { flagRoutes } from './routes/flags.js';
import { authRoutes } from './routes/auth.js';
import { tokenRoutes } from './routes/tokens.js';
import { userRoutes } from './routes/users.js';
import { auditLogRoutes } from './routes/audit-log.js';
import { healthRoutes } from './routes/health.js';
import './types.js';

const port = Number(process.env.PORT) || 3100;

async function start() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
          };
        },
        res(reply) {
          return {
            statusCode: reply.statusCode,
          };
        },
      },
    },
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  const db = await initDatabase();
  app.decorate('db', db);

  // Graceful shutdown: close the database pool
  app.addHook('onClose', async () => {
    await db.close();
  });

  app.setErrorHandler((error: { statusCode?: number; code?: string; message?: string }, _request, reply) => {
    if (error.statusCode === 400 && error.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
      return reply.status(400).send({ error: 'Unsupported content type', statusCode: 400 });
    }
    if (error.statusCode === 400) {
      return reply.status(400).send({ error: 'Invalid JSON body', statusCode: 400 });
    }
    reply
      .status(error.statusCode ?? 500)
      .send({ error: error.message ?? 'Internal server error', statusCode: error.statusCode ?? 500 });
  });

  // Structured request logging: log method, path, status, and duration
  app.addHook('onRequest', async (request) => {
    request.startTime = Date.now();
  });

  app.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - (request.startTime || Date.now());
    request.log.info({
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      durationMs: duration,
    }, 'request completed');
  });

  await app.register(healthRoutes, { prefix: '/health' });

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(tokenRoutes, { prefix: '/api/tokens' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(flagRoutes, { prefix: '/api/flags' });
  await app.register(auditLogRoutes, { prefix: '/api/audit-log' });

  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Flag Service running on http://localhost:${port}`);
}

start();
