# 🗄️ Database Setup - Complete Guide

## Current Status
Your app is configured to use **Supabase** as the database, but the tables haven't been created yet. That's why you're seeing 404 errors.

---

## 🚀 Quick Setup (5 Minutes)

### Option 1: Via Supabase Dashboard (Recommended)

**Step 1: Open Supabase**
1. Go to: https://supabase.com/dashboard
2. Log in to your account
3. Select project: `dmsiccvhweqdpxbzbqig`

**Step 2: Run Migration**
1. Click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open `supabase/migrations/20241111_initial_schema.sql` in your code editor
4. Copy **ALL 271 lines** of SQL
5. Paste into Supabase SQL Editor
6. Click **"Run"** (or press `Cmd/Ctrl + Enter`)

**Step 3: Verify**
- You should see: **"Success. No rows returned"**
- Go to **Table Editor** → You should see 9 tables

**Step 4: Test**
1. Refresh your app: `Cmd/Ctrl + Shift + R`
2. Go to `/signup` and create an account
3. Your team will be created automatically
4. You'll become admin

### Option 2: Via Terminal Script

```bash
# Run the setup script
./setup-database.sh
```

This will guide you through the process with detailed instructions.

---

## 📊 What Gets Created

### Database Tables (9 total)

```sql
1. users
   - Extended auth.users with role and team_id
   - Roles: admin, project_manager, user
   
2. teams
   - Organization/workspace management
   - Each user belongs to one team
   
3. projects
   - Time tracking projects
   - Includes hourly_rate for billing
   - Links to clients
   
4. clients
   - Client contact management
   - Full contact information
   - Team-scoped
   
5. time_entries
   - Time tracking records
   - Links to projects and users
   - Includes duration and description
   
6. tags
   - Entry categorization
   - Team-scoped or global
   
7. entry_tags
   - Many-to-many junction table
   - Links tags to time entries
   
8. invoices
   - Invoice tracking
   - Status: draft, sent, paid, overdue
   - Links to clients and projects
   
9. invoice_items
   - Invoice line items
   - Links to time entries
```

### Relationships

```
teams
  ├── users (team members)
  ├── projects
  │   ├── client (optional)
  │   └── time_entries
  │       ├── user
  │       └── tags (via entry_tags)
  ├── clients
  └── invoices
      ├── client
      └── invoice_items
          └── time_entry (optional)
```

### Security (RLS Policies)

Every table has **Row Level Security** enabled with policies:

```sql
✅ users
   - Can view own profile
   - Can view team members
   - Can update own profile

✅ teams
   - Members can view their team
   - Admins can manage teams

✅ projects
   - Users can view team projects
   - PMs and admins can manage projects

✅ clients
   - Users can view team clients
   - PMs and admins can manage clients

✅ time_entries
   - Users can CRUD own entries
   - PMs can view all team entries

✅ invoices
   - Users can view team invoices
   - PMs can manage invoices
```

### Performance Features

```sql
✅ Indexes on all foreign keys
✅ Indexes on frequently queried fields
✅ Auto-updating timestamps (updated_at)
✅ Proper foreign key constraints
✅ Cascading deletes where appropriate
```

---

## 🔧 Configuration

### Your Current Setup

**Supabase Project:**
- URL: `https://dmsiccvhweqdpxbzbqig.supabase.co`
- Located in: `.env.example`

**Database:**
- PostgreSQL (via Supabase)
- Version: 15+

**Migration File:**
- Path: `supabase/migrations/20241111_initial_schema.sql`
- Lines: 271
- Status: ⚠️ Not yet applied

---

## ✅ Verification

### After Running Migration

**1. Check Tables Exist**
```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected output: 9 tables

**2. Check RLS is Enabled**
```sql
-- Run in Supabase SQL Editor
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

All should have `rowsecurity = true`

**3. Test App**
- [ ] Clients page loads (empty state, not 404)
- [ ] Team page loads
- [ ] Can sign up
- [ ] Can add a client
- [ ] Can create a project

---

## 🎯 How Signup Works

When you sign up, the app automatically:

```typescript
1. Creates Supabase auth user
   ↓
2. Creates team: "{Your Name}'s Team"
   ↓
3. Creates user profile in users table
   ├── Links to team (team_id)
   ├── Sets role to 'admin'
   └── Stores full name
   ↓
4. You can now use all features!
```

See: `src/contexts/AuthContext.tsx` line 47-80

---

## 📝 Migration Contents

The migration creates:

### Tables
```sql
CREATE TABLE users ...
CREATE TABLE teams ...
CREATE TABLE projects ...
CREATE TABLE clients ...
CREATE TABLE time_entries ...
CREATE TABLE tags ...
CREATE TABLE entry_tags ...
CREATE TABLE invoices ...
CREATE TABLE invoice_items ...
```

### Types
```sql
CREATE TYPE user_role AS ENUM ('admin', 'project_manager', 'user');
```

### Security
```sql
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
CREATE POLICY "..." ON ... FOR ... USING (...);
```

### Performance
```sql
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
-- ... 6 more indexes
```

### Triggers
```sql
CREATE FUNCTION update_updated_at_column() ...
CREATE TRIGGER update_users_updated_at ...
-- ... 5 more triggers
```

---

## 🐛 Troubleshooting

### "404 Not Found" errors

**Cause:** Tables don't exist  
**Fix:** Run the migration

### "relation already exists"

**Cause:** Migration already ran  
**Fix:** You're good! Just refresh your app

### "permission denied"

**Cause:** Not project owner  
**Fix:** Check you're logged into correct Supabase account

### Signup fails

**Cause:** User profile creation failed  
**Check:** 
1. Did migration run successfully?
2. Check Supabase logs: Dashboard → Logs
3. Try with different email

### Can't see team members

**Check your user:**
```sql
SELECT id, email, team_id, role 
FROM users 
WHERE email = 'your@email.com';
```

If `team_id` is null:
- Sign out and sign up again with new email
- Or manually create team

---

## 🔄 Resetting Database

If you need to start fresh:

```sql
-- ⚠️ WARNING: This deletes ALL data!

-- Run in Supabase SQL Editor
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS entry_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Then re-run the migration
```

---

## 📈 Next Steps

After setup:

1. **Sign up** at `/signup`
2. **Add clients** at `/clients`
3. **Create projects** at `/projects`
4. **Track time** at `/timer`
5. **Invite team** at `/team`
6. **Generate invoices** at `/invoices`

---

## 🎉 Success Checklist

- [ ] Migration ran successfully
- [ ] 9 tables visible in Table Editor
- [ ] RLS enabled on all tables
- [ ] App loads without 404 errors
- [ ] Can sign up
- [ ] Team created automatically
- [ ] Can add clients
- [ ] Can create projects
- [ ] Can track time

---

## 📞 Support

If stuck:

1. **Check logs:** Supabase Dashboard → Logs
2. **Review docs:** 
   - `SETUP_DATABASE.md`
   - `FIX_404_ERRORS.md`
   - `TEAM_FEATURE_EXPLAINED.md`
3. **Verify environment:**
   ```bash
   cat .env
   echo $VITE_SUPABASE_URL
   ```

---

**Ready? Run the migration and your app will be fully connected to Supabase!** 🚀
