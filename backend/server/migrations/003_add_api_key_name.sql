-- Add optional name and last_used_at to api_keys for better UX
ALTER TABLE IF EXISTS api_keys
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITHOUT TIME ZONE;

-- Helpful index for last_used_at queries
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at);