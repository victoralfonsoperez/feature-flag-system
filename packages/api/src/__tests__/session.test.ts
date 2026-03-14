import { describe, it, expect, vi } from 'vitest';
import { createTokenPair, validateRefreshToken, revokeRefreshToken, revokeAllUserSessions } from '../auth/session.js';
import type { Database } from '../db.js';

function createMockDb(overrides: Partial<Database> = {}): Database {
  return {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    getOne: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    exec: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('session', () => {
  const user = { id: 1, email: 'test@example.com', role: 'admin' };

  describe('createTokenPair', () => {
    it('returns access and refresh tokens', async () => {
      const db = createMockDb();
      const pair = await createTokenPair(db, user);
      expect(pair.accessToken).toBeTypeOf('string');
      expect(pair.refreshToken).toBeTypeOf('string');
      expect(pair.accessToken).not.toBe(pair.refreshToken);
    });

    it('inserts session into database', async () => {
      const run = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const db = createMockDb({ run });
      await createTokenPair(db, user);
      expect(run).toHaveBeenCalledWith(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
        expect.any(String),
        1,
        expect.any(String),
      );
    });
  });

  describe('validateRefreshToken', () => {
    it('returns true for valid non-expired session', async () => {
      const futureDate = new Date(Date.now() + 60000).toISOString();
      const db = createMockDb({
        getOne: vi.fn().mockResolvedValue({ expires_at: futureDate }),
      });
      expect(await validateRefreshToken(db, 'valid-jti')).toBe(true);
    });

    it('returns false for non-existent session', async () => {
      const db = createMockDb();
      expect(await validateRefreshToken(db, 'missing')).toBe(false);
    });

    it('returns false and deletes expired session', async () => {
      const pastDate = new Date(Date.now() - 60000).toISOString();
      const run = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const db = createMockDb({
        getOne: vi.fn().mockResolvedValue({ expires_at: pastDate }),
        run,
      });
      expect(await validateRefreshToken(db, 'expired-jti')).toBe(false);
      expect(run).toHaveBeenCalledWith('DELETE FROM sessions WHERE id = ?', 'expired-jti');
    });
  });

  describe('revokeRefreshToken', () => {
    it('deletes session by jti', async () => {
      const run = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const db = createMockDb({ run });
      await revokeRefreshToken(db, 'some-jti');
      expect(run).toHaveBeenCalledWith('DELETE FROM sessions WHERE id = ?', 'some-jti');
    });
  });

  describe('revokeAllUserSessions', () => {
    it('deletes all sessions for a user', async () => {
      const run = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const db = createMockDb({ run });
      await revokeAllUserSessions(db, 42);
      expect(run).toHaveBeenCalledWith('DELETE FROM sessions WHERE user_id = ?', 42);
    });
  });
});
