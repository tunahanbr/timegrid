-- Migration: Phase 3 - Advanced Features
-- Description: Budget tracking, expense tracking, multi-currency, recurring invoices
-- Created: 2025-11-11

-- Project Budgets table
CREATE TABLE IF NOT EXISTS project_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  period TEXT NOT NULL, -- 'monthly', 'quarterly', 'yearly', 'total'
  start_date DATE,
  end_date DATE,
  alert_threshold DECIMAL(5, 2) DEFAULT 80.00, -- Alert when X% of budget used
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(project_id, period, start_date)
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  category TEXT NOT NULL, -- 'travel', 'meals', 'equipment', 'software', 'other'
  description TEXT,
  receipt_url TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_billable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Currency rates table (for multi-currency support)
CREATE TABLE IF NOT EXISTS currency_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(10, 6) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(from_currency, to_currency, date)
);

-- Recurring invoices table
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL, -- 'weekly', 'monthly', 'quarterly', 'yearly'
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add currency column to projects (if not exists)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Add currency column to invoices (if not exists)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_budgets_project_id ON project_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_currency_rates_currencies ON currency_rates(from_currency, to_currency, date);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_run ON recurring_invoices(next_run_date) WHERE is_active = true;

-- Enable RLS
ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_budgets
CREATE POLICY "Users can view budgets for their projects"
  ON project_budgets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_budgets.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create budgets for their projects"
  ON project_budgets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_budgets.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update budgets for their projects"
  ON project_budgets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_budgets.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete budgets for their projects"
  ON project_budgets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_budgets.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for expenses
CREATE POLICY "Users can view their own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for currency_rates (public read, admin write)
CREATE POLICY "Anyone can view currency rates"
  ON currency_rates FOR SELECT
  USING (true);

-- RLS Policies for recurring_invoices
CREATE POLICY "Users can view their own recurring invoices"
  ON recurring_invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring invoices"
  ON recurring_invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring invoices"
  ON recurring_invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring invoices"
  ON recurring_invoices FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_project_budgets_updated_at BEFORE UPDATE ON project_budgets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_invoices_updated_at BEFORE UPDATE ON recurring_invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default currency rates (you'd update these via API in production)
INSERT INTO currency_rates (from_currency, to_currency, rate) VALUES
  ('USD', 'EUR', 0.85),
  ('USD', 'GBP', 0.73),
  ('USD', 'JPY', 110.50),
  ('USD', 'CAD', 1.25),
  ('EUR', 'USD', 1.18),
  ('GBP', 'USD', 1.37),
  ('JPY', 'USD', 0.0091),
  ('CAD', 'USD', 0.80)
ON CONFLICT (from_currency, to_currency, date) DO NOTHING;

-- Add comments
COMMENT ON TABLE project_budgets IS 'Budget tracking per project with alerts';
COMMENT ON TABLE expenses IS 'Track project expenses with receipts';
COMMENT ON TABLE currency_rates IS 'Exchange rates for multi-currency support';
COMMENT ON TABLE recurring_invoices IS 'Automatically generate invoices on schedule';
