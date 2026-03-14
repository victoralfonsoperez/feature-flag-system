import * as jose from 'jose';
import { vi } from 'vitest';
import { initDatabase, type Database } from '../db.js';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://kanary_test:kanary_test@localhost:5433/kanary_test';

// Generate RS256 key pair once for all tests
let keyPair: Awaited<ReturnType<typeof jose.generateKeyPair>> | null = null;

async function getKeyPair() {
  if (!keyPair) {
    keyPair = await jose.generateKeyPair('RS256');
  }
  return keyPair;
}

/**
 * Create a signed Auth0-like JWT for testing.
 */
export async function createTestToken(claims: {
  sub?: string;
  email?: string;
  roles?: string[];
} = {}): Promise<string> {
  const { privateKey } = await getKeyPair();
  const jwt = await new jose.SignJWT({
    email: claims.email ?? 'test@example.com',
    'https://kanary.dev/roles': claims.roles ?? ['admin'],
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(claims.sub ?? 'auth0|test-user-123')
    .setIssuer('https://test-tenant.us.auth0.com/')
    .setAudience('https://api.kanary.dev')
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(privateKey);
  return jwt;
}

/**
 * Mock the Auth0 JWKS verification so tests don't call a real endpoint.
 * Must be called before importing auth0.ts or after resetJWKS().
 */
export async function mockAuth0Verification() {
  const { publicKey } = await getKeyPair();

  // Set required env vars
  process.env.AUTH0_DOMAIN = 'test-tenant.us.auth0.com';
  process.env.AUTH0_AUDIENCE = 'https://api.kanary.dev';

  // Mock the jose.createRemoteJWKSet to return our test public key
  vi.mock('jose', async (importOriginal) => {
    const actual = await importOriginal<typeof import('jose')>();
    return {
      ...actual,
      createRemoteJWKSet: () => {
        // Return a function that resolves the key for verification
        return async () => {
          return publicKey;
        };
      },
    };
  });
}

export async function createTestDb(): Promise<Database> {
  const db = await initDatabase(TEST_DATABASE_URL);
  await cleanTables(db);
  return db;
}

export async function cleanTables(db: Database): Promise<void> {
  await db.exec('DELETE FROM audit_log');
  await db.exec('DELETE FROM api_tokens');
  await db.exec('DELETE FROM flags');
}
