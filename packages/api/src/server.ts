import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { initDatabase } from './db.js';
import { flagRoutes } from './routes/flags.js';
import { authRoutes } from './routes/auth.js';
import { tokenRoutes } from './routes/tokens.js';
import './types.js';

const port = Number(process.env.PORT) || 3100;

async function start() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);

  const db = initDatabase();
  app.decorate('db', db);

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

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(tokenRoutes, { prefix: '/api/tokens' });
  await app.register(flagRoutes, { prefix: '/api/flags' });

  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Flag Service running on http://localhost:${port}`);
}

start();
