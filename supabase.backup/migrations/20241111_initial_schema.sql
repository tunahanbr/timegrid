-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'project_manager', 'user');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'user' NOT NULL,
  team_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  address TEXT,
  phone TEXT,
  notes TEXT,
  team_id UUID REFERENCES public.teams(id),
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#888888',
  hourly_rate DECIMAL(10, 2) DEFAULT 0,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id),
  created_by UUID REFERENCES public.users(id) NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  team_id UUID REFERENCES public.teams(id),
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Time entries table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- in seconds
  date DATE NOT NULL,
  team_id UUID REFERENCES public.teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Entry tags junction table
CREATE TABLE public.entry_tags (
  entry_id UUID REFERENCES public.time_entries(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  team_id UUID REFERENCES public.teams(id),
  created_by UUID REFERENCES public.users(id) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Invoice items table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  time_entry_id UUID REFERENCES public.time_entries(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  rate DECIMAL(10, 2) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add foreign key for team_id in users table
ALTER TABLE public.users ADD CONSTRAINT users_team_id_fkey 
  FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view team members" ON public.users
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

-- RLS Policies for teams table
CREATE POLICY "Team members can view their team" ON public.teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage teams" ON public.teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for projects table
CREATE POLICY "Users can view team projects" ON public.projects
  FOR SELECT USING (
    team_id IS NULL OR team_id IN (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Project managers and admins can manage projects" ON public.projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (role IN ('admin', 'project_manager') OR created_by = auth.uid())
    )
  );

-- RLS Policies for clients table
CREATE POLICY "Users can view team clients" ON public.clients
  FOR SELECT USING (
    team_id IS NULL OR team_id IN (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Project managers and admins can manage clients" ON public.clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'project_manager')
    )
  );

-- RLS Policies for time_entries table
CREATE POLICY "Users can view own time entries" ON public.time_entries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own time entries" ON public.time_entries
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own time entries" ON public.time_entries
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own time entries" ON public.time_entries
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Managers can view team time entries" ON public.time_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'project_manager')
      AND (team_id IS NULL OR team_id = time_entries.team_id)
    )
  );

-- RLS Policies for tags table
CREATE POLICY "Users can view team tags" ON public.tags
  FOR SELECT USING (
    team_id IS NULL OR team_id IN (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create tags" ON public.tags
  FOR INSERT WITH CHECK (
    team_id IS NULL OR team_id IN (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

-- RLS Policies for invoices table
CREATE POLICY "Users can view team invoices" ON public.invoices
  FOR SELECT USING (
    team_id IS NULL OR team_id IN (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Managers can manage invoices" ON public.invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'project_manager')
    )
  );

-- Create indexes for better query performance
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_project_id ON public.time_entries(project_id);
CREATE INDEX idx_time_entries_date ON public.time_entries(date);
CREATE INDEX idx_time_entries_team_id ON public.time_entries(team_id);
CREATE INDEX idx_projects_team_id ON public.projects(team_id);
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_users_team_id ON public.users(team_id);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
