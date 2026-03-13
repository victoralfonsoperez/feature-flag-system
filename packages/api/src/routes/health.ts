import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));
const startTime = Date.now();

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: pkg.version,
    });
  });
}
