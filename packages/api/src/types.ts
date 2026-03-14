import type { Database } from './db.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
  interface FastifyRequest {
    user?: { id: number; email: string; role: string; source: 'session' | 'api-token' };
    startTime?: number;
  }
}
