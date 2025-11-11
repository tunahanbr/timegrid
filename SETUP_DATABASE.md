# 🚀 Quick Setup Guide - Run Database Migration

## Your Issue
The app is getting 404 errors because the database tables don't exist yet in your Supabase project.

**Your Supabase Project:** `dmsiccvhweqdpxbzbqig.supabase.co`

---

## ✅ Solution: Run the Database Migration (3 minutes)

### Step 1: Open Supabase Dashboard
1. Go to: **https://supabase.com/dashboard**
2. Select your project: `dmsiccvhweqdpxbzbqig`

### Step 2: Open SQL Editor
1. Click **"SQL Editor"** in the left sidebar
2. Click **"New query"** button

### Step 3: Copy & Run the Migration
1. Open the file: `supabase/migrations/20241111_initial_schema.sql`
2. **Copy ALL the SQL code** (entire file)
3. **Paste it** into the SQL Editor
4. Click **"Run"** button (or press `Cmd/Ctrl + Enter`)

### Step 4: Verify Success
You should see:
```
Success. No rows returned
```

This means all 9 tables were created successfully! ✅

---

## 📋 What Tables Will Be Created

The migration creates:
- ✅ **users** - Extended auth with roles (admin, project_manager, user)
- ✅ **teams** - Organization/workspace management
- ✅ **projects** - Projects with hourly rates and client linkage
- ✅ **clients** - Client contact management
- ✅ **time_entries** - Time tracking records
- ✅ **tags** - Entry categorization
- ✅ **entry_tags** - Many-to-many junction table
- ✅ **invoices** - Invoice tracking
- ✅ **invoice_items** - Invoice line items

Plus:
- 🔐 Row Level Security (RLS) policies
- 🔑 Database indexes for performance
- ⚡ Triggers for auto-updating timestamps

---

## 🎯 After Running Migration

### 1. Refresh Your App
Just reload the page - the 404 errors should be gone!

### 2. First-Time User Setup
When you first sign up, you'll need to:

**Option A: Auto-create team on signup** (Recommended)
- Modify signup to auto-create a team for new users
- I can help implement this

**Option B: Manual team creation**
- After signup, user needs to call `createTeam("My Team")`
- Can be triggered from settings or first-load

### 3. Test It Works
1. Go to Clients page - should show empty state instead of 404
2. Go to Team page - should show empty state or your user
3. Add a client - should work without errors
4. Add a project - should work without errors

---

## 🐛 Troubleshooting

### Still Getting 404 Errors?
**Check:**
1. Did migration run successfully in SQL Editor?
2. Are you using the correct Supabase URL in `.env`?
3. Try refreshing the page (hard refresh: `Cmd/Ctrl + Shift + R`)

### Check Current Supabase Project:
```bash
# Your .env should have:
VITE_SUPABASE_URL=https://dmsiccvhweqdpxbzbqig.supabase.co
```

Make sure this matches your actual Supabase project!

### Verify Tables Were Created:
In Supabase Dashboard:
1. Go to **Table Editor**
2. You should see all 9 tables listed
3. If not, re-run the migration

---

## 🔧 Optional: Create Your .env File

If you haven't already:
```bash
# In your terminal
cp .env.example .env
```

Your `.env` file should contain your actual Supabase credentials.

---

## 📝 What's Next

After the migration runs successfully:

### Immediate Next Steps:
1. **Create your account** - Sign up at `/signup`
2. **Create a team** - You'll become admin automatically
3. **Test features**:
   - Add clients
   - Create projects  
   - Track time
   - Invite team members

### If You Need Help:
Just let me know if:
- Migration fails (share the error)
- Tables don't appear
- Still getting 404s
- Need help with team creation

---

## ⚡ Quick Command Reference

```bash
# View migration file
cat supabase/migrations/20241111_initial_schema.sql

# Start dev server
npm run dev

# Check logs
# (In browser console, Network tab)
```

---

## 🎉 Summary

**Problem:** Database tables don't exist (404 errors)  
**Solution:** Run migration in Supabase SQL Editor  
**Time:** 3 minutes  
**Result:** Full database with all features enabled  

**Ready to try?** Just follow Step 1-4 above! 🚀
