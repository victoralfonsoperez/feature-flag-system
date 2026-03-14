import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { healthRoutes } from '../routes/health';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  await app.register(healthRoutes, { prefix: '/health' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('GET /health', () => {
  it('returns status ok with uptime and version', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof body.version).toBe('string');
    expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('returns consistent version from package.json', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    const body = res.json();
    expect(body.version).toBe('0.1.0');
  });

  it('returns increasing uptime on subsequent calls', async () => {
    const res1 = await app.inject({ method: 'GET', url: '/health' });
    const uptime1 = res1.json().uptime;

    // uptime should be >= previous (both within same second is fine)
    const res2 = await app.inject({ method: 'GET', url: '/health' });
    const uptime2 = res2.json().uptime;
    expect(uptime2).toBeGreaterThanOrEqual(uptime1);
  });
});
