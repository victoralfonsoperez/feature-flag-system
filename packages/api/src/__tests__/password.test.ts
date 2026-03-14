import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../auth/password.js';

describe('password', () => {
  describe('hashPassword', () => {
    it('returns a salt:hash string', async () => {
      const hashed = await hashPassword('secret123');
      expect(hashed).toContain(':');
      const [salt, hash] = hashed.split(':');
      expect(salt).toHaveLength(32); // 16 bytes hex
      expect(hash).toHaveLength(128); // 64 bytes hex
    });

    it('produces different hashes for the same password (random salt)', async () => {
      const h1 = await hashPassword('same');
      const h2 = await hashPassword('same');
      expect(h1).not.toBe(h2);
    });
  });

  describe('verifyPassword', () => {
    it('verifies a correct password', async () => {
      const hashed = await hashPassword('mypassword');
      expect(await verifyPassword('mypassword', hashed)).toBe(true);
    });

    it('rejects an incorrect password', async () => {
      const hashed = await hashPassword('mypassword');
      expect(await verifyPassword('wrong', hashed)).toBe(false);
    });

    it('handles empty password', async () => {
      const hashed = await hashPassword('');
      expect(await verifyPassword('', hashed)).toBe(true);
      expect(await verifyPassword('notempty', hashed)).toBe(false);
    });
  });
});
