# Manual Database Setup Guide

Your `.env` has been updated to use the correct project: **wxpgvoftrhhsojwamlsa**

Since the Supabase CLI is having connection issues, here's how to set up your database manually:

## Quick Setup (5 minutes)

### 1. Open Supabase Dashboard
Go to: https://supabase.com/dashboard/project/wxpgvoftrhhsojwamlsa/editor

### 2. Open SQL Editor
- Click **"SQL Editor"** in the left sidebar
- Click **"New query"**

### 3. Run Each Migration File

Copy and paste the contents of each file below **in order**, running each one before moving to the next:

#### Migration 1: API Keys
```bash
# Copy contents from:
supabase/migrations/20241111_api_keys.sql
```
- Paste into SQL Editor
- Click **"Run"** (or Cmd/Ctrl + Enter)
- Wait for "Success" message

#### Migration 2: Initial Schema
```bash
# Copy contents from:
supabase/migrations/20241111_initial_schema.sql
```
- Paste into SQL Editor
- Click **"Run"**
- Wait for "Success" message

#### Migration 3: Integrations
```bash
# Copy contents from:
supabase/migrations/20241111_integrations.sql
```
- Paste into SQL Editor
- Click **"Run"**
- Wait for "Success" message

#### Migration 4: Per-Project Architecture
```bash
# Copy contents from:
supabase/migrations/20241111_per_project_architecture.sql
```
- Paste into SQL Editor
- Click **"Run"**
- Wait for "Success" message

#### Migration 5: Phase 3 Advanced Features
```bash
# Copy contents from:
supabase/migrations/20241111_phase3_advanced_features.sql
```
- Paste into SQL Editor
- Click **"Run"**
- Wait for "Success" message

### 4. Verify Tables Created

In the SQL Editor, run this query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see these 14 tables:
- ✅ api_keys
- ✅ clients
- ✅ currency_rates
- ✅ entry_tags
- ✅ expenses
- ✅ invoice_items
- ✅ invoices
- ✅ oauth_tokens
- ✅ project_budgets
- ✅ project_members
- ✅ projects
- ✅ recurring_invoices
- ✅ tags
- ✅ time_entries

### 5. Regenerate TypeScript Types (Optional)

If you have Supabase CLI working, run:
```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

Or you can use the Supabase dashboard to generate types:
1. Go to **Settings** → **API**
2. Scroll to **Generated API Types**
3. Copy the TypeScript types
4. Replace contents of `src/integrations/supabase/types.ts`

### 6. Restart Your App

```bash
# Stop the dev server (Ctrl+C)
# Restart it
npm run dev
# or
bun run dev
```

### 7. Test It!

1. Open your app in the browser
2. Try creating a project
3. The error should be gone! ✅

## What Was Fixed?

1. ✅ Updated `.env` to use correct project (wxpgvoftrhhsojwamlsa)
2. 🔄 Migrations need to be applied manually via Supabase dashboard
3. 🔄 Types will be regenerated after migrations

## Troubleshooting

### "Relation already exists" errors
- This means some tables were already created
- Safe to ignore if the migration completes

### Still getting 404 errors?
- Make sure you ran ALL 5 migrations in order
- Check the Tables view in Supabase dashboard to see what tables exist
- Verify your `.env` file has the correct URL (wxpgvoftrhhsojwamlsa)
- Hard refresh your browser (Cmd/Ctrl + Shift + R)

### CLI Connection Issues
If you want to fix the CLI connection issues:
```bash
# Check if you're logged in
supabase logout
supabase login

# Link to correct project
supabase link --project-ref wxpgvoftrhhsojwamlsa

# Try pushing again
supabase db push --linked
```

## Alternative: Use the Deploy Script

Once your connection is stable, you can use:
```bash
chmod +x deploy-database.sh
./deploy-database.sh
```

This will automatically push all migrations and regenerate types.
