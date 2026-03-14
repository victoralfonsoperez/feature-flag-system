import { initDatabase } from './db.js';
import { hashPassword } from './auth/password.js';

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: tsx src/seed-admin.ts <email> <password>');
  process.exit(1);
}

async function main() {
  const db = await initDatabase();

  const existing = await db.getOne('SELECT id FROM users WHERE email = ?', email);
  if (existing) {
    console.error(`User ${email} already exists`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  await db.run(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
    email,
    passwordHash,
    'admin',
  );

  console.log(`Admin user created: ${email}`);
  await db.close();
}

main();
