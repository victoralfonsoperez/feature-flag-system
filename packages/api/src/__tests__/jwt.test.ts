import { describe, it, expect, vi, afterEach } from 'vitest';
import { signJwt, verifyJwt, decodeJwt } from '../auth/jwt.js';

describe('jwt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const payload = { sub: 1, email: 'test@example.com', role: 'admin' };

  describe('signJwt', () => {
    it('returns a three-part JWT string', () => {
      const token = signJwt(payload, 300);
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('embeds correct payload fields', () => {
      const token = signJwt(payload, 300);
      const [, payloadB64] = token.split('.');
      const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
      expect(decoded.sub).toBe(1);
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('admin');
      expect(decoded.iat).toBeTypeOf('number');
      expect(decoded.exp).toBe(decoded.iat + 300);
    });

    it('includes jti when provided', () => {
      const token = signJwt({ ...payload, jti: 'abc123' }, 300);
      const [, payloadB64] = token.split('.');
      const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
      expect(decoded.jti).toBe('abc123');
    });
  });

  describe('verifyJwt', () => {
    it('verifies a valid token', () => {
      const token = signJwt(payload, 300);
      const result = verifyJwt(token);
      expect(result).not.toBeNull();
      expect(result!.sub).toBe(1);
      expect(result!.email).toBe('test@example.com');
    });

    it('returns null for expired token', () => {
      const token = signJwt(payload, -10); // already expired
      expect(verifyJwt(token)).toBeNull();
    });

    it('returns null for tampered payload', () => {
      const token = signJwt(payload, 300);
      const parts = token.split('.');
      // Tamper with payload
      const tampered = Buffer.from(JSON.stringify({ ...payload, role: 'superadmin', iat: 0, exp: 9999999999 }));
      parts[1] = tampered.toString('base64url');
      expect(verifyJwt(parts.join('.'))).toBeNull();
    });

    it('returns null for malformed token', () => {
      expect(verifyJwt('not.a.valid.token')).toBeNull();
      expect(verifyJwt('')).toBeNull();
      expect(verifyJwt('onlyone')).toBeNull();
    });

    it('returns null for tampered signature', () => {
      const token = signJwt(payload, 300);
      const parts = token.split('.');
      parts[2] = 'invalidsignature';
      expect(verifyJwt(parts.join('.'))).toBeNull();
    });
  });

  describe('decodeJwt', () => {
    it('decodes a valid token ignoring expiry', () => {
      const token = signJwt(payload, -10); // expired
      const result = decodeJwt(token);
      expect(result).not.toBeNull();
      expect(result!.sub).toBe(1);
    });

    it('returns null for tampered signature', () => {
      const token = signJwt(payload, 300);
      const parts = token.split('.');
      parts[2] = 'invalidsignature';
      expect(decodeJwt(parts.join('.'))).toBeNull();
    });

    it('returns null for malformed token', () => {
      expect(decodeJwt('bad')).toBeNull();
    });
  });
});
