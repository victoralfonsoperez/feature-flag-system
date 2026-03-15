-- Add app_id column to api_tokens for app-scoped SDK tokens
-- Tokens with NULL app_id are unscoped (dashboard/CI tokens)
-- Tokens with app_id set are scoped to read flags for that app only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_tokens' AND column_name = 'app_id'
  ) THEN
    ALTER TABLE api_tokens ADD COLUMN app_id TEXT;
  END IF;
END $$;
