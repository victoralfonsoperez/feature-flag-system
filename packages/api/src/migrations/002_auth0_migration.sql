-- Auth0 migration: remove local user management, adapt api_tokens
-- This migration is idempotent (safe to run multiple times).

-- Step 1: Add creator_email and creator_role to api_tokens (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_tokens' AND column_name = 'creator_email'
  ) THEN
    ALTER TABLE api_tokens ADD COLUMN creator_email TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_tokens' AND column_name = 'creator_role'
  ) THEN
    ALTER TABLE api_tokens ADD COLUMN creator_role TEXT;
  END IF;
END
$$;

-- Step 2: Copy email/role from users into api_tokens (if users table still exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    UPDATE api_tokens SET
      creator_email = u.email,
      creator_role = u.role
    FROM users u
    WHERE api_tokens.created_by = u.id::TEXT
      AND api_tokens.creator_email IS NULL;
  END IF;
END
$$;

-- Step 3: Drop sessions table
DROP TABLE IF EXISTS sessions;

-- Step 4: Ensure created_by is TEXT type (recreate table if it's INTEGER)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_tokens' AND column_name = 'created_by' AND data_type = 'integer'
  ) THEN
    CREATE TABLE api_tokens_new (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL,
      creator_email TEXT,
      creator_role TEXT,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    INSERT INTO api_tokens_new (id, name, token_hash, created_by, creator_email, creator_role, last_used_at, created_at)
    SELECT id, name, token_hash, created_by::TEXT, creator_email, creator_role, last_used_at, created_at
    FROM api_tokens;

    DROP TABLE api_tokens;
    ALTER TABLE api_tokens_new RENAME TO api_tokens;
  END IF;
END
$$;

-- Step 5: Drop users table
DROP TABLE IF EXISTS users;
