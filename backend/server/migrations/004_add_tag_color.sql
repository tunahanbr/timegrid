-- Add color column to tags table
ALTER TABLE tags ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

