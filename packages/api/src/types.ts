import type { Database } from './db.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
  interface FastifyRequest {
    user?: { id: string; email: string; role: string; source: 'auth0' | 'api-token'; appId?: string };
    startTime?: number;
  }
}
