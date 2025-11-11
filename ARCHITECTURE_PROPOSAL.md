# Architecture Proposal: Flexible Team & Feature System

## Problem Statement
Current architecture forces all users into a "team" concept and enables all features (invoices, clients, team management) even for solo users who just want simple time tracking.

## Proposed Solution

### 1. Per-Project Team Members (Instead of Global Team)

**Database Changes:**
```sql
-- Remove team_id from users table (users don't "belong" to one team)
ALTER TABLE public.users DROP COLUMN team_id;

-- Add project_members junction table
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'user' NOT NULL,
  can_edit BOOLEAN DEFAULT TRUE,
  can_view_all_entries BOOLEAN DEFAULT FALSE, -- See other members' time
  invited_by UUID REFERENCES public.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Update projects table
ALTER TABLE public.projects DROP COLUMN team_id;
ALTER TABLE public.projects ADD COLUMN is_solo BOOLEAN DEFAULT TRUE;

-- Keep teams table but make it optional (for organizations)
-- Users can create "organizations" if they want centralized billing
ALTER TABLE public.teams ADD COLUMN settings JSONB DEFAULT '{}';
```

**Key Concepts:**
- Projects are **owned by the creator** by default
- Creator can invite **specific people to specific projects**
- Each project member has a role (admin, manager, member, viewer)
- No forced "team" concept - solo users just have solo projects

### 2. Feature Flags / User Preferences

**Add user settings:**
```sql
ALTER TABLE public.users ADD COLUMN settings JSONB DEFAULT '{
  "features": {
    "clients": false,
    "invoicing": false,
    "projects": true,
    "tags": true,
    "reports": true,
    "collaboration": false
  },
  "preferences": {
    "theme": "system",
    "defaultView": "timer",
    "weekStart": "monday"
  }
}';
```

**UI Behavior:**
```typescript
// Conditionally render navigation based on enabled features
const { settings } = useAuth();

if (settings.features.clients) {
  // Show Clients menu item
}

if (settings.features.invoicing) {
  // Show Invoices menu item
}

if (!settings.features.collaboration) {
  // Hide "Share Project" / "Invite" buttons
}
```

### 3. User Modes / Templates

**On signup, ask user to choose mode:**

```
┌─────────────────────────────────────┐
│   What describes you best?          │
│                                      │
│   ○ Solo Freelancer                 │
│     Just me tracking my time        │
│     → Enables: Timer, Projects      │
│                                      │
│   ○ Freelancer with Clients         │
│     I bill clients for my work      │
│     → Enables: Timer, Projects,     │
│       Clients, Invoices             │
│                                      │
│   ○ Agency/Team                     │
│     Multiple people, shared work    │
│     → Enables: Everything           │
│                                      │
│   ○ Personal (No billing)           │
│     Just tracking my own time       │
│     → Enables: Timer only           │
│                                      │
│   [You can change this anytime]     │
└─────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Per-Project Members
1. Create `project_members` table
2. Update RLS policies to check project membership
3. Add "Share Project" UI to individual projects
4. Migrate existing team members to project members

### Phase 2: Feature Flags
1. Add `settings` JSONB to users table
2. Create Settings page with feature toggles
3. Update navigation to respect flags
4. Create onboarding flow for new users

### Phase 3: Invitation System (Per Project)
1. Create `project_invitations` table
2. Implement email invitations via Supabase Edge Functions
3. Add invitation acceptance flow
4. Support invite links (no signup required for view-only)

## Use Case Examples

### Example 1: Solo Developer
```
- Signs up, chooses "Personal" mode
- Sees only: Timer, Projects, Reports
- Can track time across personal projects
- No clients, invoices, or team features
- Can upgrade to "Freelancer" mode later
```

### Example 2: Freelancer
```
- Signs up, chooses "Freelancer with Clients"
- Sees: Timer, Projects, Clients, Invoices
- Can add clients, link projects to clients
- Generate invoices based on tracked time
- No collaboration features (all projects solo)
```

### Example 3: Freelancer + Contractor
```
- Has 3 clients (A, B, C)
- Project for Client A: Just the freelancer
- Project for Client B: Freelancer + Designer (invited)
- Project for Client C: Solo again
- Designer only sees Client B project
- Each project can have different hourly rates
```

### Example 4: Agency
```
- 5 employees, 10 clients
- Create "organization" (optional Teams feature)
- Each project has specific team members:
  - Website Redesign: Designer + Developer + PM
  - Mobile App: 2 Developers + PM
  - Consulting: Just PM
- Billing manager sees all invoices
- Employees only see their assigned projects
```

## Benefits

✅ **Flexible**: Works for solo users and large teams
✅ **Progressive**: Start simple, add features as needed
✅ **Private**: Only see projects you're involved in
✅ **Scalable**: From 1 user to 1000+ users
✅ **Clean UX**: No overwhelming features for simple use cases
✅ **Multi-tenant**: Freelancer can work with multiple teams

## Migration Strategy

For existing users:
1. Keep current team structure as fallback
2. Auto-migrate: team members → all projects as members
3. Suggest users review project members
4. Deprecate global team concept over time

## Database Schema Summary

```
users
  - id
  - email
  - full_name
  - role (default user role, can be overridden per project)
  - settings (JSONB with feature flags)
  - created_at

projects (owner: user who created it)
  - id
  - name
  - color
  - hourly_rate
  - client_id (optional)
  - created_by
  - is_solo (true if no other members)
  
project_members (who has access to which project)
  - project_id
  - user_id
  - role (admin, manager, member, viewer)
  - can_edit
  - can_view_all_entries
  
project_invitations (pending invitations)
  - project_id
  - email
  - role
  - token
  - expires_at

teams (OPTIONAL - for organizations that want central billing)
  - id
  - name
  - settings
  
time_entries
  - user_id
  - project_id (automatically checks if user is project member)
  - duration
  - date
```

## Next Steps

Would you like me to:
1. ✅ Implement the per-project member system
2. ✅ Add feature flags and settings page
3. ✅ Create onboarding flow with user modes
4. ✅ Update all RLS policies for project-based access
5. ✅ Migrate existing team structure to project members

This would give you the flexibility you're looking for!
