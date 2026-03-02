import Fastify from 'fastify';
import cors from '@fastify/cors';
import { initDatabase } from './db.js';
import { flagRoutes } from './routes/flags.js';

const port = Number(process.env.PORT) || 3100;

async function start() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  const db = initDatabase();
  app.decorate('db', db);

  await app.register(flagRoutes, { prefix: '/api/flags' });

  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Flag Service running on http://localhost:${port}`);
}

start();
