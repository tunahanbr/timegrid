# 🔧 Fix 404 Errors - Complete Setup Guide

## ❌ Current Problem

You're seeing these 404 errors:
```
GET /rest/v1/users?select=id,team_id&id=eq.xxx [404]
GET /rest/v1/clients?select=*&order=name.asc [404]
```

**Cause:** The database tables don't exist in your Supabase project yet.

---

## ✅ Solution (5 Minutes)

### Step 1️⃣: Run the Database Migration

**Go to Supabase Dashboard:**
1. Open: https://supabase.com/dashboard
2. Select your project: `dmsiccvhweqdpxbzbqig`
3. Click **"SQL Editor"** in the left sidebar

**Run the Migration:**
1. Click **"New query"**
2. Open `supabase/migrations/20241111_initial_schema.sql` in your code editor
3. Copy **ALL** the SQL code (271 lines)
4. Paste into Supabase SQL Editor
5. Click **"Run"** (or `Cmd/Ctrl + Enter`)

**Expected Result:**
```
Success. No rows returned
```

### Step 2️⃣: Verify Tables Created

In Supabase Dashboard:
1. Click **"Table Editor"** in the left sidebar
2. You should see **9 tables**:
   - ✅ users
   - ✅ teams
   - ✅ projects
   - ✅ clients
   - ✅ time_entries
   - ✅ tags
   - ✅ entry_tags
   - ✅ invoices
   - ✅ invoice_items

### Step 3️⃣: Refresh Your App

1. Go back to your app
2. Hard refresh: `Cmd/Ctrl + Shift + R`
3. 404 errors should be gone! ✅

---

## 🎯 First-Time Setup

After migration runs successfully:

### 1. Sign Up
- Go to `/signup`
- Enter your email, password, and full name
- Click "Sign Up"

### 2. Auto-Team Creation (Already Configured!)
The app will **automatically**:
- ✅ Create a team named "{Your Name}'s Team"
- ✅ Make you the **admin** of that team
- ✅ Link your user profile to the team

### 3. Start Using Features
Now you can:
- ✅ Add clients (no more 404!)
- ✅ Create projects
- ✅ Track time
- ✅ Invite team members
- ✅ Generate invoices

---

## 🔍 Verification Checklist

After running the migration:

### Check 1: Tables Exist
```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```
Should return 9 tables.

### Check 2: RLS is Enabled
```sql
-- Run in Supabase SQL Editor
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```
All should show `rowsecurity = true`.

### Check 3: App Works
- [ ] Clients page loads (empty state, not 404)
- [ ] Team page loads (shows you as member)
- [ ] Projects page loads
- [ ] Can add a new client
- [ ] Can create a project

---

## 🐛 Troubleshooting

### Issue: Still Getting 404 Errors

**Check Your .env File:**
```bash
# Should match your Supabase project
VITE_SUPABASE_URL=https://dmsiccvhweqdpxbzbqig.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJI...
```

If different, update `.env` to match `.env.example`.

**Check Browser Console:**
1. Open DevTools (`F12`)
2. Go to Network tab
3. Look at the failing requests
4. Verify the URL starts with `https://dmsiccvhweqdpxbzbqig.supabase.co`

### Issue: Migration Fails

**Common Errors:**

1. **"relation already exists"**
   - Tables already created! You're good.
   - Just refresh your app.

2. **"permission denied"**
   - You need to be project owner
   - Check you're in the right Supabase project

3. **Syntax error**
   - Make sure you copied the **entire** SQL file
   - Don't modify the SQL

**Fix:**
- Delete existing tables (if any) and re-run migration
- Or: Create a fresh Supabase project

### Issue: Can't Sign Up

**Error: "Failed to create profile"**
- Migration didn't run properly
- Re-run the migration
- Check Supabase logs: Dashboard → Logs

**Error: "Email already exists"**
- Try signing in instead
- Or use a different email

### Issue: Team Page Shows "No team members"

This is normal if:
- ✅ You just signed up
- ✅ Haven't invited anyone yet

To fix:
1. Check if you have a team_id:
```sql
-- Run in Supabase SQL Editor
SELECT id, email, team_id, role 
FROM users 
WHERE email = 'your@email.com';
```

2. If `team_id` is null:
   - Sign out and sign up again (with new email)
   - Or manually create a team via Settings

---

## 📝 What the Migration Does

Creates **9 tables** with:

### Core Tables
- **users** - Extended auth with roles (admin, project_manager, user)
- **teams** - Workspaces/organizations
- **projects** - Time tracking projects with hourly rates
- **clients** - Client contact management
- **time_entries** - Time tracking records

### Supporting Tables
- **tags** - Entry categorization
- **entry_tags** - Links tags to entries (many-to-many)
- **invoices** - Invoice tracking
- **invoice_items** - Invoice line items

### Security Features
- 🔐 **Row Level Security (RLS)** on all tables
- 🔑 **Role-based policies** (admin, PM, user)
- 👥 **Team data isolation** (can't see other teams)

### Performance Features
- ⚡ **Database indexes** on foreign keys
- 🔄 **Auto-updating timestamps** (updated_at triggers)

---

## 🚀 Next Steps After Setup

### Immediate:
1. **Add your first client**
   - Go to Clients page
   - Click "Add Client"
   - Fill in details

2. **Create your first project**
   - Go to Projects page
   - Click "New Project"
   - Set hourly rate
   - Link to client

3. **Track some time**
   - Go to Timer page
   - Select project
   - Start timer

### Later:
1. **Invite team members**
   - Go to Team page
   - Click "Invite Member"
   - Choose their role

2. **Generate an invoice**
   - Go to Invoices page
   - Click "Create Invoice"
   - Select client and time entries

3. **View analytics**
   - Go to Dashboard
   - See charts and stats

---

## 📊 Database Schema Overview

```
users (you)
  └── team_id → teams
                  ├── projects
                  │     ├── hourly_rate
                  │     └── client_id → clients
                  │
                  ├── time_entries
                  │     ├── project_id
                  │     ├── tags (via entry_tags)
                  │     └── user_id
                  │
                  └── invoices
                        ├── client_id
                        └── invoice_items
                              └── time_entry_id
```

---

## 🎉 Success Indicators

You'll know setup is complete when:

✅ No 404 errors in browser console  
✅ Clients page shows empty state (not error)  
✅ Team page shows you as admin  
✅ Can add a client successfully  
✅ Can create a project  
✅ Can track time  

---

## 💡 Pro Tips

### Speed Up Development:
```typescript
// Add sample data via SQL Editor
INSERT INTO clients (name, email, company, created_by) 
VALUES ('Acme Corp', 'contact@acme.com', 'Acme Corporation', 'YOUR_USER_ID');
```

### Check Current User:
```typescript
// In browser console
const { data } = await supabase.auth.getUser();
console.log(data.user);
```

### View Team Info:
```sql
-- In Supabase SQL Editor
SELECT u.email, u.role, t.name as team_name
FROM users u
LEFT JOIN teams t ON u.team_id = t.id;
```

---

## 📞 Need Help?

If you're still stuck:

1. **Share the error:**
   - Open browser console
   - Copy the full error message
   - Share it with me

2. **Check Supabase logs:**
   - Dashboard → Logs
   - Look for errors around the time of signup

3. **Verify environment:**
   ```bash
   # Print current config
   echo $VITE_SUPABASE_URL
   cat .env
   ```

---

## ✅ Quick Checklist

Before asking for help, verify:

- [ ] Migration ran successfully in SQL Editor
- [ ] All 9 tables exist in Table Editor
- [ ] `.env` file has correct Supabase URL
- [ ] Hard refreshed the app (`Cmd/Ctrl + Shift + R`)
- [ ] Signed up with a new account (if testing)
- [ ] Checked browser console for errors
- [ ] Verified Supabase project is correct one

---

**Run the migration and you'll be up and running in 5 minutes!** 🚀
