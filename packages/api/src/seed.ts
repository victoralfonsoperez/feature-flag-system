import { initDatabase } from './db.js';

const db = initDatabase();

db.exec(`DELETE FROM audit_log`);
db.exec(`DELETE FROM flags`);

const insert = db.prepare(
  `INSERT INTO flags (key, value, type, environment, description, variants)
   VALUES (?, ?, ?, ?, ?, ?)`
);

const flags = [
  // Boolean flags — runtime
  ['enable_dark_mode', 'true', 'runtime', 'production', 'Toggle dark mode UI', null],
  ['maintenance_mode', 'false', 'runtime', 'production', 'Show maintenance page', null],
  ['enable_signup', 'true', 'runtime', 'staging', 'Allow new user signups', null],

  // Boolean flags — build-time
  ['enable_new_checkout', 'true', 'build-time', 'production', 'Use the redesigned checkout flow', null],
  ['enable_ssr', 'false', 'build-time', 'development', 'Enable server-side rendering', null],

  // String flags
  ['api_base_url', 'https://api.example.com', 'build-time', 'production', 'Base URL for API calls', null],
  ['welcome_message', 'Welcome to our app!', 'runtime', 'production', 'Homepage welcome banner text', null],
  ['support_email', 'help@example.com', 'runtime', 'staging', 'Support contact email', null],

  // JSON flags
  [
    'rate_limits',
    JSON.stringify({ requests: 100, window: '1m' }),
    'runtime',
    'production',
    'API rate limiting configuration',
    null,
  ],
  [
    'feature_tiers',
    JSON.stringify({ free: ['basic'], pro: ['basic', 'advanced', 'export'] }),
    'runtime',
    'production',
    'Feature access per pricing tier',
    null,
  ],

  // Flag with A/B test variants
  [
    'cta_button_color',
    'blue',
    'runtime',
    'production',
    'Call-to-action button color experiment',
    JSON.stringify([
      { name: 'control', value: 'blue', weight: 50 },
      { name: 'variant_a', value: 'green', weight: 25 },
      { name: 'variant_b', value: 'orange', weight: 25 },
    ]),
  ],
];

const insertMany = db.transaction(() => {
  for (const [key, value, type, environment, description, variants] of flags) {
    insert.run(key, value, type, environment, description, variants);
  }
});

insertMany();

console.log(`Seeded ${flags.length} flags.`);
