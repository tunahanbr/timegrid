-- Add recurring events support to time_entries table

ALTER TABLE time_entries 
ADD COLUMN recurrence_rule TEXT,
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN parent_entry_id INTEGER REFERENCES time_entries(id) ON DELETE CASCADE;

-- Index for faster recurring event queries
CREATE INDEX idx_time_entries_recurring ON time_entries(user_id, is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX idx_time_entries_parent ON time_entries(parent_entry_id);
