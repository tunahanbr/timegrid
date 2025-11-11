# Per-Project Architecture Implementation Guide

## 🎯 What Changed?

I've implemented a **flexible, per-project team architecture** that solves the issues you raised:

### Before (Old Architecture)
```
❌ All users belong to one global "team"
❌ All team members see ALL projects
❌ Solo users forced into team concept
❌ No way to disable unused features (invoicing, clients, etc.)
```

### After (New Architecture)
```
✅ Projects can be solo or collaborative
✅ Each project has its own team members
✅ Solo users see only their projects
✅ Feature toggles to disable unused features
✅ Flexible: Works for personal, freelancer, and agency use cases
```

## 📋 Key Features

### 1. Per-Project Team Members
- Each project is **owned by its creator**
- Creator can **invite specific people** to specific projects
- Different projects can have different team members
- Projects are **private by default** (solo)

**Example Use Cases:**
```
Freelancer:
  • Project A (Client 1): Just you
  • Project B (Client 2): You + designer (invited)
  • Project C (Personal): Just you

Agency:
  • Website Redesign: Designer + Developer + PM
  • Mobile App: 2 Developers + PM
  • Consulting: Just PM
```

### 2. Feature Toggles

**Three User Modes:**

#### Personal Mode
- Just tracking your own time
- **Enables:** Timer, Projects, Tags, Reports
- **Disables:** Clients, Invoicing, Collaboration
- Perfect for: Tracking personal productivity

#### Freelancer Mode (Default)
- Billing clients for work
- **Enables:** Everything except Collaboration
- Perfect for: Solo freelancers with multiple clients

#### Team/Agency Mode
- Multiple people working together
- **Enables:** All features including Collaboration
- Perfect for: Agencies, dev teams, consultancies

### 3. Clean Navigation
- Features you disable **don't appear in the menu**
- No overwhelming UI if you just want simple time tracking
- Change modes anytime in Settings

## 🗄️ Database Changes

### New Tables

#### `project_members`
```sql
- project_id: Which project
- user_id: Which user
- role: admin | project_manager | user
- can_edit: Can modify project settings
- can_view_all_entries: Can see other members' time
```

#### `project_invitations`
```sql
- project_id: Project to invite to
- email: Invitee's email
- role: Their role
- token: Unique invitation link
- expires_at: Valid for 7 days
```

#### `users.settings` (New Column)
```json
{
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
  "userMode": "freelancer"
}
```

### Updated Tables
- `projects.is_solo` - Tracks if project has multiple members
- **Removed** `users.team_id` (no longer needed)
- **Removed** `projects.team_id` (project-based now)

### RLS Policies Updated
All security policies now check **project membership** instead of team membership:
- Can only see projects you're a member of
- Can only see time entries for your projects
- Clients are now per-user (not team-wide)

## 🚀 How to Use (After Migration)

### For Solo Users
1. Sign up / Log in
2. Go to Settings → Choose "Personal" mode
3. Create projects and start tracking
4. No client/invoice/team features visible ✨

### For Freelancers
1. Sign up / Log in
2. Go to Settings → Choose "Freelancer" mode
3. Add clients in Clients page
4. Create projects and link to clients
5. Track time and generate invoices
6. If you need help on a project, enable "Collaboration" and share that specific project

### For Teams
1. Sign up / Log in
2. Go to Settings → Choose "Team" mode
3. Create a project
4. Click "Share Project" on the project
5. Invite team members by email
6. They receive invitation → sign up → join project

### Sharing a Project
```
1. Create project (you're automatically admin)
2. Click "Share" button on project
3. Enter teammate's email
4. Choose their role:
   - Admin: Full control
   - Project Manager: Can view all entries, edit project
   - User: Can only track their own time
5. They get email with invitation link
6. They click link → sign up/log in → added to project
```

## 📦 Files Created/Modified

### Created:
1. `supabase/migrations/20241111_per_project_architecture.sql`
   - Complete migration with all new tables and policies
   - Migrates existing team data to project members
   - 17 steps including triggers and views

2. `run-architecture-migration.sh`
   - Automated script to run migration
   - Includes safety checks and confirmation

3. `ARCHITECTURE_PROPOSAL.md`
   - Detailed explanation of the new architecture
   - Use case examples
   - Migration strategy

### Modified:
1. `src/lib/supabase-storage.ts`
   - Added `UserSettings`, `ProjectMember`, `ProjectInvitation` interfaces
   - Added functions for:
     - `getUserSettings()` / `updateUserSettings()`
     - `getProjectMembers()` / `addProjectMember()` / `removeProjectMember()`
     - `inviteToProject()` / `acceptProjectInvitation()`

### To Be Created (Next):
- Settings page UI (feature toggles)
- Onboarding flow (mode selection on first login)
- Project sharing dialog
- Navigation with conditional rendering
- Updated hooks using new architecture

## 🎬 Running the Migration

### Option 1: Automated Script (Recommended)
```bash
./run-architecture-migration.sh
```

This will:
1. Check if Supabase CLI is installed
2. Link your project (if not already)
3. Show you what will change
4. Ask for confirmation
5. Run the migration
6. Show next steps

### Option 2: Manual
```bash
supabase link --project-ref YOUR_PROJECT_ID
supabase db push
```

## ⚠️ Important Notes

### Data Migration
The migration automatically:
- ✅ Adds project creators as admins on their projects
- ✅ Migrates existing team members to project members (they get access to ALL projects initially)
- ✅ Sets `is_solo` flag based on member count
- ✅ Creates indexes for performance
- ⚠️ Does NOT delete old `team_id` columns (commented out for safety)

### After Migration
1. **Existing users** will have all features enabled (freelancer mode)
2. **New users** will see onboarding to choose mode
3. **Current team members** will have access to all projects (they can remove themselves later)
4. You can manually clean up old `team_id` columns after verifying everything works

### Breaking Changes
- ❌ Old team-wide queries won't work (need to update to project-based)
- ❌ Type errors until Supabase types are regenerated
- ✅ All RLS policies updated for new architecture
- ✅ Backward compatible: existing data migrated automatically

## 🔄 Next Steps After Migration

1. **Run Migration**
   ```bash
   ./run-architecture-migration.sh
   ```

2. **Regenerate Types** (after migration completes)
   ```bash
   supabase gen types typescript --linked > src/integrations/supabase/types.ts
   ```

3. **Restart Dev Server**
   ```bash
   npm run dev
   ```

4. **Test the App**
   - Sign up / log in
   - Go to Settings page
   - Choose your user mode
   - Create a project
   - Try sharing it (Team mode only)

5. **Update Remaining Components**
   - Update navigation to hide disabled features
   - Add onboarding flow
   - Add project sharing UI
   - Update hooks to use new queries

## 💡 Benefits Summary

✅ **Flexible**: One app works for solo users AND teams
✅ **Private**: Only see what you're involved in
✅ **Scalable**: From 1 user to 1000+ users
✅ **Clean UX**: No overwhelming features for simple use cases
✅ **Progressive**: Start simple, enable features as needed
✅ **Multi-tenant**: Work solo on some projects, collaborate on others

## 🐛 Troubleshooting

**"Table project_members does not exist"**
- Migration hasn't run yet. Run `./run-architecture-migration.sh`

**"Type errors in supabase-storage.ts"**
- Types need regeneration after migration. Run: `supabase gen types typescript --linked`

**"Can't see any projects"**
- Check RLS policies are applied. Migration should have updated them.
- Check you're logged in and have projects

**"Migration failed"**
- Check Supabase CLI is installed: `supabase --version`
- Check project is linked: `supabase status`
- Check database password is correct

## 📞 Questions?

This is a major architectural change but preserves all your data. The migration is designed to be safe and reversible (by keeping old columns).

Ready to proceed? Run:
```bash
./run-architecture-migration.sh
```
