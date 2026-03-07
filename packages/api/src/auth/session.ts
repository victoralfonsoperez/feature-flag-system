import { randomBytes } from 'node:crypto';
import type Database from 'better-sqlite3';
import { signJwt } from './jwt.js';

const ACCESS_TOKEN_TTL = 5 * 60; // 5 minutes
const REFRESH_TOKEN_TTL = 4 * 60 * 60; // 4 hours

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export function createTokenPair(
  db: Database.Database,
  user: { id: number; email: string; role: string },
): TokenPair {
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
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
    jti,
    user.id,
    expiresAt,
  );

  return { accessToken, refreshToken };
}

export function validateRefreshToken(
  db: Database.Database,
  jti: string,
): boolean {
  const row = db
    .prepare('SELECT expires_at FROM sessions WHERE id = ?')
    .get(jti) as { expires_at: string } | undefined;

  if (!row) return false;
  if (new Date(row.expires_at) <= new Date()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(jti);
    return false;
  }
  return true;
}

export function revokeRefreshToken(db: Database.Database, jti: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(jti);
}

export function revokeAllUserSessions(db: Database.Database, userId: number): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function cleanExpiredSessions(db: Database.Database): void {
  db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
}

export { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL };
