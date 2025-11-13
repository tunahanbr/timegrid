-- Migration: Add settings column to users table
-- Date: 2025-11-12
-- Description: Adds a JSONB column to store user settings (features, preferences, onboarding status, user mode)

-- Add settings column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Create index for faster settings queries
CREATE INDEX IF NOT EXISTS idx_users_settings ON users USING gin(settings);

-- Sample settings structure:
-- {
--   "features": {
--     "clients": true,
--     "invoicing": true,
--     "projects": true,
--     "tags": true,
--     "reports": true,
--     "collaboration": false
--   },
--   "preferences": {
--     "theme": "dark",
--     "defaultView": "timer",
--     "weekStart": "monday"
--   },
--   "onboardingCompleted": false,
--   "userMode": "freelancer"
-- }
