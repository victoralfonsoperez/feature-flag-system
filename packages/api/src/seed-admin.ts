import { initDatabase } from './db.js';
import { hashPassword } from './auth/password.js';

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: tsx src/seed-admin.ts <email> <password>');
  process.exit(1);
}

async function main() {
  const db = initDatabase();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    console.error(`User ${email} already exists`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(
    email,
    passwordHash,
    'admin',
  );

  console.log(`Admin user created: ${email}`);
  db.close();
}

main();
