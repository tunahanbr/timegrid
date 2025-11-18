-- Performance Optimization: Add indexes for time tracking queries
-- Run this migration to improve query performance on large datasets

-- Index for time entries by user and start time (most common query)
-- Supports: SELECT * FROM time_entries WHERE user_id = ? ORDER BY start_time DESC
CREATE INDEX IF NOT EXISTS idx_time_entries_user_start 
ON time_entries(user_id, start_time DESC);

-- Index for time entries by project (for project-specific queries)
-- Supports: SELECT * FROM time_entries WHERE project_id = ?
CREATE INDEX IF NOT EXISTS idx_time_entries_project 
ON time_entries(project_id);

-- Index for time entries by date range (for reports and filtering)
-- Supports: SELECT * FROM time_entries WHERE start_time >= ? AND start_time <= ?
CREATE INDEX IF NOT EXISTS idx_time_entries_date_range 
ON time_entries(start_time, end_time);

-- Index for time entries by user and project (combined queries)
-- Supports: SELECT * FROM time_entries WHERE user_id = ? AND project_id = ?
CREATE INDEX IF NOT EXISTS idx_time_entries_user_project 
ON time_entries(user_id, project_id);

-- Index for projects by user (for project listings)
-- Supports: SELECT * FROM projects WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_projects_user 
ON projects(user_id);

-- Index for clients by user (for client listings)
-- Supports: SELECT * FROM clients WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_clients_user 
ON clients(user_id);

-- Index for tags by user (for tag listings)
-- Supports: SELECT * FROM tags WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_tags_user 
ON tags(user_id);

-- Index for invoices by client (for client-specific invoices)
-- Supports: SELECT * FROM invoices WHERE client_id = ?
CREATE INDEX IF NOT EXISTS idx_invoices_client 
ON invoices(client_id);

-- Index for invoice items by invoice (for invoice details)
-- Supports: SELECT * FROM invoice_items WHERE invoice_id = ?
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice 
ON invoice_items(invoice_id);

-- Index for expenses by project (for project expenses)
-- Supports: SELECT * FROM expenses WHERE project_id = ?
CREATE INDEX IF NOT EXISTS idx_expenses_project 
ON expenses(project_id);

-- Index for team members by user (for team listings)
-- Supports: SELECT * FROM team_members WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_team_members_user 
ON team_members(user_id);

-- Partial index for active timers (only running entries)
-- Supports: SELECT * FROM time_entries WHERE user_id = ? AND end_time IS NULL
CREATE INDEX IF NOT EXISTS idx_time_entries_active 
ON time_entries(user_id, start_time) 
WHERE end_time IS NULL;

-- Analyze tables to update statistics after creating indexes
ANALYZE time_entries;
ANALYZE projects;
ANALYZE clients;
ANALYZE tags;
ANALYZE invoices;
ANALYZE invoice_items;
ANALYZE expenses;
ANALYZE team_members;

-- Verification query: Check if indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
