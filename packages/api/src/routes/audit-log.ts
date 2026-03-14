import rateLimit from '@fastify/rate-limit';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import type { AuditLogRow } from '../db.js';
import '../types.js';

export async function auditLogRoutes(app: FastifyInstance) {
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  app.get('/', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { flag_key, limit, offset, app_id } = request.query as {
      flag_key?: string;
      limit?: string;
      offset?: string;
      app_id?: string;
    };

    const queryLimit = Math.min(Math.max(parseInt(limit ?? '50', 10) || 50, 1), 200);
    const queryOffset = Math.max(parseInt(offset ?? '0', 10) || 0, 0);

    let sql = 'SELECT * FROM audit_log WHERE 1=1';
    const params: (string | number)[] = [];

    if (app_id) {
      sql += ' AND app_id = ?';
      params.push(app_id);
    }

    if (flag_key) {
      sql += ' AND flag_key = ?';
      params.push(flag_key);
    }

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(queryLimit, queryOffset);

    const entries = await app.db.getAll<AuditLogRow>(sql, ...params);
    return reply.send(entries);
  });
}
