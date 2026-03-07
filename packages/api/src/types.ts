import type Database from 'better-sqlite3';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database.Database;
  }
  interface FastifyRequest {
    user?: { id: number; email: string; role: string; source: 'session' | 'api-token' };
  }
}
