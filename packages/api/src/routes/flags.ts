import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { triggerGitHubRebuild } from '../webhook.js';
import type { FlagRow } from '../db.js';

export async function flagRoutes(app: FastifyInstance) {
  // GET /api/flags — list all flags, filterable by type and env
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { type, env } = request.query as { type?: string; env?: string };

    let sql = 'SELECT * FROM flags WHERE 1=1';
    const params: string[] = [];

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
    const { env, type, user_id } = request.query as {
      env?: string;
      type?: string;
      user_id?: string;
    };

    let sql = 'SELECT * FROM flags WHERE 1=1';
    const params: string[] = [];

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
    for (const flag of flags) {
      if (flag.variants && user_id) {
        resolved[flag.key] = resolveVariant(flag.variants, user_id);
      } else {
        resolved[flag.key] = flag.value;
      }
    }

    return reply.send(resolved);
  });

  // GET /api/flags/:key — get a single flag
  app.get('/:key', async (request: FastifyRequest, reply: FastifyReply) => {
    const { key } = request.params as { key: string };
    const flag = app.db.prepare('SELECT * FROM flags WHERE key = ?').get(key);

    if (!flag) {
      return reply.status(404).send({ error: 'Flag not found' });
    }
    return reply.send(flag);
  });

  // POST /api/flags — create a new flag
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { key, value, type, environment, description, variants } =
      request.body as Partial<FlagRow>;

    if (!key || !value || !type) {
      return reply.status(400).send({ error: 'key, value, and type are required' });
    }

    app.db
      .prepare(
        `INSERT INTO flags (key, value, type, environment, description, variants)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(key, value, type, environment ?? 'production', description ?? '', variants ?? null);

    app.db
      .prepare('INSERT INTO audit_log (flag_key, action, new_value) VALUES (?, ?, ?)')
      .run(key, 'created', value);

    const created = app.db.prepare('SELECT * FROM flags WHERE key = ?').get(key);
    return reply.status(201).send(created);
  });

  // PUT /api/flags/:key — update a flag
  app.put('/:key', async (request: FastifyRequest, reply: FastifyReply) => {
    const { key } = request.params as { key: string };
    const { value, description, variants } = request.body as Partial<FlagRow>;

    const existing = app.db.prepare('SELECT * FROM flags WHERE key = ?').get(key) as
      | FlagRow
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Flag not found' });
    }

    const newValue = value ?? existing.value;
    const newDescription = description ?? existing.description;
    const newVariants = variants !== undefined ? variants : existing.variants;

    app.db
      .prepare(
        `UPDATE flags
         SET value = ?, description = ?, variants = ?, updated_at = datetime('now')
         WHERE key = ?`
      )
      .run(newValue, newDescription, newVariants, key);

    app.db
      .prepare(
        'INSERT INTO audit_log (flag_key, action, old_value, new_value) VALUES (?, ?, ?, ?)'
      )
      .run(key, 'updated', existing.value, newValue);

    // Trigger rebuild if build-time flag changed
    if (existing.type === 'build-time' && newValue !== existing.value) {
      await triggerGitHubRebuild(key);
    }

    const updated = app.db.prepare('SELECT * FROM flags WHERE key = ?').get(key);
    return reply.send(updated);
  });

  // DELETE /api/flags/:key — remove a flag
  app.delete('/:key', async (request: FastifyRequest, reply: FastifyReply) => {
    const { key } = request.params as { key: string };

    const existing = app.db.prepare('SELECT * FROM flags WHERE key = ?').get(key) as
      | FlagRow
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Flag not found' });
    }

    app.db.prepare('DELETE FROM flags WHERE key = ?').run(key);

    app.db
      .prepare('INSERT INTO audit_log (flag_key, action, old_value) VALUES (?, ?, ?)')
      .run(key, 'deleted', existing.value);

    return reply.status(204).send();
  });
}

function resolveVariant(variantsJson: string, userId: string): string {
  const variants = JSON.parse(variantsJson) as Array<{
    name: string;
    value: string;
    weight: number;
  }>;

  // Deterministic hash based on user ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  const bucket = hash % totalWeight;

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant.value;
    }
  }

  return variants[variants.length - 1].value;
}
