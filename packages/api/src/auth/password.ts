import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(hash, 'hex');
  return timingSafeEqual(key, storedKey);
}
