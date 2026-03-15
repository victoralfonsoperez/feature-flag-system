import { vi } from 'vitest';

// Set required env vars before anything else
process.env.AUTH0_DOMAIN = 'test-tenant.us.auth0.com';
process.env.AUTH0_AUDIENCE = 'https://api.kanary.dev';

// Mock jose.createRemoteJWKSet — the factory is hoisted and cannot access outer scope,
// so we store the key on globalThis and read it lazily inside the mock.
vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jose')>();
  return {
    ...actual,
    createRemoteJWKSet: () => {
      return async () => {
        return (globalThis as Record<string, unknown>).__TEST_PUBLIC_KEY__;
      };
    },
  };
});
