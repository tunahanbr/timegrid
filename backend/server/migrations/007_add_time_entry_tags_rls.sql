-- Enable Row Level Security on time_entry_tags (optional for self-hosted PostgreSQL)
-- Note: RLS is primarily for Supabase. For direct database access, this is optional.

-- For now, just ensure the table exists and has proper indexes
CREATE INDEX IF NOT EXISTS idx_time_entry_tags_time_entry_id ON time_entry_tags(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_time_entry_tags_tag_id ON time_entry_tags(tag_id);

-- Add comment to document the table
COMMENT ON TABLE time_entry_tags IS 'Junction table for many-to-many relationship between time_entries and tags';
