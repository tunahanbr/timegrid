-- Phase 3 - Advanced Features: Budgets, Expenses, Multi-currency, Recurring Invoices

-- Project Budgets table
CREATE TABLE IF NOT EXISTS project_budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
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
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(10, 6) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(from_currency, to_currency, date)
);

-- Recurring invoices table
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_budgets_project_id ON project_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_currency_rates_currencies ON currency_rates(from_currency, to_currency, date);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_run ON recurring_invoices(next_run_date) WHERE is_active = true;

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
