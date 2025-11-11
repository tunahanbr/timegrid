-- Migration: Per-Project Architecture with Feature Toggles
-- This migration changes from team-wide access to per-project team members
-- and adds user settings for feature toggles

-- 1. Add settings to users table for feature flags
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "features": {
    "clients": true,
    "invoicing": true,
    "projects": true,
    "tags": true,
    "reports": true,
    "collaboration": true
  },
  "preferences": {
    "theme": "system",
    "defaultView": "timer",
    "weekStart": "monday"
  },
  "onboarding_completed": false,
  "user_mode": "freelancer"
}'::jsonb;

-- 2. Create project_members table (replaces team-wide membership)
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role user_role DEFAULT 'user' NOT NULL,
  can_edit BOOLEAN DEFAULT TRUE NOT NULL,
  can_view_all_entries BOOLEAN DEFAULT FALSE NOT NULL,
  invited_by UUID REFERENCES public.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(project_id, user_id)
);

-- 3. Create project_invitations table for pending invitations
CREATE TABLE IF NOT EXISTS public.project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role user_role DEFAULT 'user' NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES public.users(id) NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMPTZ,
  UNIQUE(project_id, email)
);

-- 4. Add is_solo flag to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_solo BOOLEAN DEFAULT TRUE;

-- 5. Migrate existing data: Add project creators as project members
INSERT INTO public.project_members (project_id, user_id, role, can_edit, can_view_all_entries)
SELECT 
  p.id as project_id,
  p.created_by as user_id,
  'admin'::user_role as role,
  TRUE as can_edit,
  TRUE as can_view_all_entries
FROM public.projects p
ON CONFLICT (project_id, user_id) DO NOTHING;

-- 6. Migrate team members to project members (if they have team_id)
-- All team members get access to all projects in their team
INSERT INTO public.project_members (project_id, user_id, role, can_edit, can_view_all_entries)
SELECT DISTINCT
  p.id as project_id,
  u.id as user_id,
  u.role as role,
  CASE WHEN u.role IN ('admin', 'project_manager') THEN TRUE ELSE FALSE END as can_edit,
  CASE WHEN u.role IN ('admin', 'project_manager') THEN TRUE ELSE FALSE END as can_view_all_entries
FROM public.projects p
CROSS JOIN public.users u
WHERE u.team_id = p.team_id
  AND u.team_id IS NOT NULL
  AND p.team_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

-- 7. Update is_solo flag based on member count
UPDATE public.projects
SET is_solo = (
  SELECT COUNT(*) = 1
  FROM public.project_members
  WHERE project_members.project_id = projects.id
);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON public.project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON public.project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON public.project_invitations(token);
CREATE INDEX IF NOT EXISTS idx_users_settings ON public.users USING GIN(settings);

-- 9. Drop old team_id columns (commented out for safety - uncomment after verification)
-- ALTER TABLE public.users DROP COLUMN IF EXISTS team_id;
-- ALTER TABLE public.projects DROP COLUMN IF EXISTS team_id;
-- ALTER TABLE public.clients DROP COLUMN IF EXISTS team_id;
-- ALTER TABLE public.time_entries DROP COLUMN IF EXISTS team_id;

-- 10. RLS Policies for project_members table
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Users can view project members for projects they're members of
CREATE POLICY "Users can view project members for their projects"
  ON public.project_members FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

-- Project admins can add members
CREATE POLICY "Project admins can add members"
  ON public.project_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = project_members.project_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Project admins can update member roles
CREATE POLICY "Project admins can update members"
  ON public.project_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'admin'
    )
  );

-- Project admins can remove members
CREATE POLICY "Project admins can remove members"
  ON public.project_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'admin'
    )
  );

-- 11. RLS Policies for project_invitations
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

-- Project members can view invitations for their projects
CREATE POLICY "Project members can view invitations"
  ON public.project_invitations FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

-- Project admins can create invitations
CREATE POLICY "Project admins can create invitations"
  ON public.project_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = project_invitations.project_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'project_manager')
    )
  );

-- Project admins can delete invitations
CREATE POLICY "Project admins can delete invitations"
  ON public.project_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = project_invitations.project_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'project_manager')
    )
  );

-- 12. Update existing RLS policies to use project_members

-- Drop old project policies
DROP POLICY IF EXISTS "Users can view projects in their team" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects in their team" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects in their team" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

-- New project policies based on project membership
CREATE POLICY "Users can view their projects"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Project members with edit permission can update"
  ON public.projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
        AND project_members.can_edit = TRUE
    )
  );

CREATE POLICY "Project admins can delete"
  ON public.projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
        AND project_members.role = 'admin'
    )
  );

-- 13. Update time_entries RLS policies
DROP POLICY IF EXISTS "Users can view time entries in their team" ON public.time_entries;
DROP POLICY IF EXISTS "Users can create their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete their own time entries" ON public.time_entries;

CREATE POLICY "Users can view time entries for their projects"
  ON public.time_entries FOR SELECT
  USING (
    -- Can see own entries
    user_id = auth.uid()
    OR
    -- Or entries on projects where they have view_all permission
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = time_entries.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.can_view_all_entries = TRUE
    )
  );

CREATE POLICY "Users can create time entries for their projects"
  ON public.time_entries FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = time_entries.project_id
        AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own time entries"
  ON public.time_entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own time entries"
  ON public.time_entries FOR DELETE
  USING (user_id = auth.uid());

-- 14. Update clients RLS policies to be user-based (not team-based)
DROP POLICY IF EXISTS "Users can view clients in their team" ON public.clients;
DROP POLICY IF EXISTS "Users can create clients in their team" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients in their team" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

CREATE POLICY "Users can view clients they created"
  ON public.clients FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create clients"
  ON public.clients FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own clients"
  ON public.clients FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own clients"
  ON public.clients FOR DELETE
  USING (created_by = auth.uid());

-- 15. Create function to auto-add project creator as admin member
CREATE OR REPLACE FUNCTION add_project_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role, can_edit, can_view_all_entries)
  VALUES (NEW.id, NEW.created_by, 'admin', TRUE, TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_project_created ON public.projects;

-- Create trigger to auto-add creator as admin
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_creator_as_member();

-- 16. Create function to update is_solo flag
CREATE OR REPLACE FUNCTION update_project_is_solo()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.projects
  SET is_solo = (
    SELECT COUNT(*) = 1
    FROM public.project_members
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
  )
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_project_member_change ON public.project_members;

-- Create trigger to update is_solo when members change
CREATE TRIGGER on_project_member_change
  AFTER INSERT OR DELETE ON public.project_members
  FOR EACH ROW
  EXECUTE FUNCTION update_project_is_solo();

-- 17. Create helper view for user's projects with member info
CREATE OR REPLACE VIEW user_projects_with_members AS
SELECT 
  p.*,
  pm.role as user_role,
  pm.can_edit,
  pm.can_view_all_entries,
  (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
  c.name as client_name
FROM projects p
INNER JOIN project_members pm ON pm.project_id = p.id
LEFT JOIN clients c ON c.id = p.client_id
WHERE pm.user_id = auth.uid();

COMMENT ON MIGRATION IS 'Migrate from team-wide access to per-project members with feature toggles';
