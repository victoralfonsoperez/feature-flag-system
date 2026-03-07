import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

export type JwtPayload = {
  sub: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
  jti?: string;
};

const _secret = process.env.JWT_SECRET;

export function getJwtSecret(): string {
  if (_secret) return _secret;
  // In tests / dev without JWT_SECRET, fall back to a generated value.
  // This means sessions won't survive restarts — acceptable for dev.
  if (!_generated) {
    _generated = randomBytes(32).toString('hex');
    if (process.env.NODE_ENV !== 'test') {
      console.warn('JWT_SECRET not set — generated an ephemeral secret. Set JWT_SECRET in production.');
    }
  }
  return _generated;
}
let _generated: string | undefined;

function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}

export function signJwt(
  payload: { sub: number; email: string; role: string; jti?: string },
  expiresInSeconds: number,
): string {
  const secret = getJwtSecret();
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64url(Buffer.from(JSON.stringify(fullPayload)));
  const signature = createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();

  return `${headerB64}.${payloadB64}.${base64url(signature)}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  const secret = getJwtSecret();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;

  // Verify signature
  const expectedSig = createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const actualSig = Buffer.from(signatureB64, 'base64url');

  if (expectedSig.length !== actualSig.length) return null;
  if (!timingSafeEqual(expectedSig, actualSig)) return null;

  // Decode payload
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as JwtPayload;

  // Check expiry
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

/** Verify signature only, ignoring expiry. Used to read claims from expired tokens. */
export function decodeJwt(token: string): JwtPayload | null {
  const secret = getJwtSecret();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;

  const expectedSig = createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const actualSig = Buffer.from(signatureB64, 'base64url');

  if (expectedSig.length !== actualSig.length) return null;
  if (!timingSafeEqual(expectedSig, actualSig)) return null;

  return JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as JwtPayload;
}
