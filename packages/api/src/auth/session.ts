import { randomBytes } from 'node:crypto';
import type { Database } from '../db.js';
import { signJwt } from './jwt.js';

const ACCESS_TOKEN_TTL = 5 * 60; // 5 minutes
const REFRESH_TOKEN_TTL = 4 * 60 * 60; // 4 hours

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export async function createTokenPair(
  db: Database,
  user: { id: number; email: string; role: string },
): Promise<TokenPair> {
  const accessToken = signJwt(
    { sub: user.id, email: user.email, role: user.role },
    ACCESS_TOKEN_TTL,
  );

  const jti = randomBytes(32).toString('hex');
  const refreshToken = signJwt(
    { sub: user.id, email: user.email, role: user.role, jti },
    REFRESH_TOKEN_TTL,
  );

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000).toISOString();
  await db.run('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
    jti,
    user.id,
    expiresAt,
  );

  return { accessToken, refreshToken };
}

export async function validateRefreshToken(
  db: Database,
  jti: string,
): Promise<boolean> {
  const row = await db.getOne<{ expires_at: string }>('SELECT expires_at FROM sessions WHERE id = ?', jti);

  if (!row) return false;
  if (new Date(row.expires_at) <= new Date()) {
    await db.run('DELETE FROM sessions WHERE id = ?', jti);
    return false;
  }
  return true;
}

export async function revokeRefreshToken(db: Database, jti: string): Promise<void> {
  await db.run('DELETE FROM sessions WHERE id = ?', jti);
}

export async function revokeAllUserSessions(db: Database, userId: number): Promise<void> {
  await db.run('DELETE FROM sessions WHERE user_id = ?', userId);
}

export async function cleanExpiredSessions(db: Database): Promise<void> {
  await db.run("DELETE FROM sessions WHERE expires_at <= NOW()");
}

export { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL };
