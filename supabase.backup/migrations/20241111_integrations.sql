-- Migration: Integrations Infrastructure
-- Description: Create tables for OAuth tokens, calendar sync, and Slack integration
-- Created: 2025-11-11

-- OAuth tokens table for storing access tokens for integrations
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL, -- 'google', 'microsoft', 'slack'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, provider)
);

-- Integration settings
CREATE TABLE IF NOT EXISTS integration_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL, -- 'google_calendar', 'outlook_calendar', 'slack'
  is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb NOT NULL, -- Provider-specific settings
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, provider)
);

-- Calendar event mappings (track which time entries are synced to which calendar events)
CREATE TABLE IF NOT EXISTS calendar_sync_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL, -- 'google', 'microsoft'
  external_event_id TEXT NOT NULL, -- Calendar event ID from the provider
  last_synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  sync_status TEXT DEFAULT 'synced' NOT NULL, -- 'synced', 'pending', 'failed'
  error_message TEXT,
  UNIQUE(time_entry_id, provider)
);

-- Slack notification log
CREATE TABLE IF NOT EXISTS slack_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'timer_start', 'timer_stop', 'daily_summary'
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  response_status INTEGER,
  error_message TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_integration_settings_user_id ON integration_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_mappings_time_entry_id ON calendar_sync_mappings(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_mappings_user_id ON calendar_sync_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_slack_notifications_user_id ON slack_notifications(user_id);

-- Enable RLS
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for oauth_tokens
CREATE POLICY "Users can view their own OAuth tokens"
  ON oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OAuth tokens"
  ON oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OAuth tokens"
  ON oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OAuth tokens"
  ON oauth_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for integration_settings
CREATE POLICY "Users can view their own integration settings"
  ON integration_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integration settings"
  ON integration_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integration settings"
  ON integration_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integration settings"
  ON integration_settings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for calendar_sync_mappings
CREATE POLICY "Users can view their own calendar mappings"
  ON calendar_sync_mappings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar mappings"
  ON calendar_sync_mappings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar mappings"
  ON calendar_sync_mappings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar mappings"
  ON calendar_sync_mappings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for slack_notifications
CREATE POLICY "Users can view their own Slack notifications"
  ON slack_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Slack notifications"
  ON slack_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE oauth_tokens IS 'Stores OAuth access/refresh tokens for third-party integrations';
COMMENT ON TABLE integration_settings IS 'Stores user preferences for each integration';
COMMENT ON TABLE calendar_sync_mappings IS 'Maps time entries to calendar events for sync tracking';
COMMENT ON TABLE slack_notifications IS 'Logs Slack notifications sent to users';
