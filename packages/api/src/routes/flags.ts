import rateLimit from '@fastify/rate-limit';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { triggerGitHubRebuild, sendWebhookNotification } from '../webhook.js';
import type { FlagRow } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import '../types.js';

export async function flagRoutes(app: FastifyInstance) {
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  // GET /api/flags — list all flags, filterable by type, env, and app_id
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { type, env, app_id } = request.query as { type?: string; env?: string; app_id?: string };
    const appId = app_id ?? 'default';

    let sql = 'SELECT * FROM flags WHERE app_id = ?';
    const params: string[] = [appId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (env) {
      sql += ' AND environment = ?';
      params.push(env);
    }

    const flags = app.db.prepare(sql).all(...params);
    return reply.send(flags);
  });

  // GET /api/flags/resolve — resolve flags for a client (runtime + A/B)
  app.get('/resolve', async (request: FastifyRequest, reply: FastifyReply) => {
    const { env, type, user_id, app_id } = request.query as {
      env?: string;
      type?: string;
      user_id?: string;
      app_id?: string;
    };
    const appId = app_id ?? 'default';

    let sql = 'SELECT * FROM flags WHERE app_id = ?';
    const params: string[] = [appId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (env) {
      sql += ' AND environment = ?';
      params.push(env);
    }

    const flags = app.db.prepare(sql).all(...params) as FlagRow[];

    const resolved: Record<string, string> = {};
    const variants: Record<string, { variant: string; flagKey: string }> = {};
    for (const flag of flags) {
      if (flag.variants && user_id) {
        const result = resolveVariant(flag.variants, user_id);
        resolved[flag.key] = result.value;
        variants[flag.key] = { variant: result.name, flagKey: flag.key };
      } else {
        resolved[flag.key] = flag.value;
      }
    }

    return reply.send({ ...resolved, _variants: variants });
  });

  // GET /api/flags/:key — get a single flag
  app.get('/:key', async (request: FastifyRequest, reply: FastifyReply) => {
    const { key } = request.params as { key: string };
    const { app_id } = request.query as { app_id?: string };
    const appId = app_id ?? 'default';

    const flag = app.db.prepare('SELECT * FROM flags WHERE app_id = ? AND key = ?').get(appId, key);

    if (!flag) {
      return reply.status(404).send({ error: 'Flag not found', statusCode: 404 });
    }
    return reply.send(flag);
  });

  // POST /api/flags — create a new flag
  app.post('/', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { key, value, type, environment, description, variants, app_id } =
      request.body as Partial<FlagRow>;
    const appId = app_id ?? 'default';

    if (!key || !value || !type) {
      return reply.status(400).send({ error: 'key, value, and type are required', statusCode: 400 });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      return reply
        .status(400)
        .send({ error: 'key must be alphanumeric with dashes or underscores only', statusCode: 400 });
    }

    if (type !== 'build-time' && type !== 'runtime') {
      return reply.status(400).send({ error: 'type must be "build-time" or "runtime"', statusCode: 400 });
    }

    const allowedEnvironments = ['development', 'staging', 'production'];
    if (environment && !allowedEnvironments.includes(environment)) {
      return reply
        .status(400)
        .send({ error: `environment must be one of: ${allowedEnvironments.join(', ')}`, statusCode: 400 });
    }

    const existing = app.db.prepare('SELECT key FROM flags WHERE app_id = ? AND key = ?').get(appId, key);
    if (existing) {
      return reply.status(409).send({ error: 'Flag key already exists', statusCode: 409 });
    }

    app.db
      .prepare(
        `INSERT INTO flags (app_id, key, value, type, environment, description, variants)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(appId, key, value, type, environment ?? 'production', description ?? '', variants ?? null);

    app.db
      .prepare('INSERT INTO audit_log (app_id, flag_key, action, new_value, changed_by) VALUES (?, ?, ?, ?, ?)')
      .run(appId, key, 'created', value, request.user?.email ?? 'unknown');

    await sendWebhookNotification(key, 'created', request.user?.email ?? 'unknown');

    const created = app.db.prepare('SELECT * FROM flags WHERE app_id = ? AND key = ?').get(appId, key);
    return reply.status(201).send(created);
  });

  // PUT /api/flags/:key — update a flag
  app.put('/:key', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { key } = request.params as { key: string };
    const { value, description, variants } = request.body as Partial<FlagRow>;
    const { app_id } = request.query as { app_id?: string };
    const appId = app_id ?? 'default';

    const existing = app.db.prepare('SELECT * FROM flags WHERE app_id = ? AND key = ?').get(appId, key) as
      | FlagRow
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Flag not found', statusCode: 404 });
    }

    const newValue = value ?? existing.value;
    const newDescription = description ?? existing.description;
    const newVariants = variants !== undefined ? variants : existing.variants;

    const changedBy = request.user?.email ?? 'unknown';

    app.db
      .prepare(
        `UPDATE flags
         SET value = ?, description = ?, variants = ?, updated_at = datetime('now'), updated_by = ?
         WHERE app_id = ? AND key = ?`
      )
      .run(newValue, newDescription, newVariants, changedBy, appId, key);

    app.db
      .prepare(
        'INSERT INTO audit_log (app_id, flag_key, action, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(appId, key, 'updated', existing.value, newValue, changedBy);

    await sendWebhookNotification(key, 'updated', changedBy);

    // Trigger rebuild if build-time flag changed
    if (existing.type === 'build-time' && newValue !== existing.value) {
      await triggerGitHubRebuild(key);
    }

    const updated = app.db.prepare('SELECT * FROM flags WHERE app_id = ? AND key = ?').get(appId, key);
    return reply.send(updated);
  });

  // DELETE /api/flags/:key — remove a flag
  app.delete('/:key', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { key } = request.params as { key: string };
    const { app_id } = request.query as { app_id?: string };
    const appId = app_id ?? 'default';

    const existing = app.db.prepare('SELECT * FROM flags WHERE app_id = ? AND key = ?').get(appId, key) as
      | FlagRow
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Flag not found', statusCode: 404 });
    }

    app.db.prepare('DELETE FROM flags WHERE app_id = ? AND key = ?').run(appId, key);

    app.db
      .prepare('INSERT INTO audit_log (app_id, flag_key, action, old_value, changed_by) VALUES (?, ?, ?, ?, ?)')
      .run(appId, key, 'deleted', existing.value, request.user?.email ?? 'unknown');

    await sendWebhookNotification(key, 'deleted', request.user?.email ?? 'unknown');

    return reply.status(204).send();
  });
}

type VariantResult = { name: string; value: string };

function resolveVariant(variantsJson: string, userId: string): VariantResult {
  const variants = JSON.parse(variantsJson) as Array<{
    name: string;
    value: string;
    weight: number;
  }>;

  // FNV-1a hash for better distribution
  let hash = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  const bucket = hash % totalWeight;

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return { name: variant.name, value: variant.value };
    }
  }

  const last = variants[variants.length - 1];
  return { name: last.name, value: last.value };
}
