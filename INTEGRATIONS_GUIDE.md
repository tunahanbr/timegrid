# Integrations Guide

Complete guide for setting up third-party integrations with TimeTrack.

## Overview

TimeTrack supports the following integrations:

- 📅 **Google Calendar** - Sync time entries as calendar events
- 📅 **Outlook Calendar** - Sync time entries to Microsoft Calendar
- 💬 **Slack** - Control timer with slash commands
- 🔑 **REST API** - Build custom integrations
- 📤 **Import** - Migrate data from Toggl/Harvest/Clockify

---

## Setup Instructions

### 1. Run Migration

First, set up the database tables and deploy Edge Functions:

```bash
./run-integrations-migration.sh
```

This will:
- Create `oauth_tokens`, `integration_settings`, `calendar_sync_mappings`, and `slack_notifications` tables
- Deploy 4 Edge Functions to Supabase
- Regenerate TypeScript types

---

## Google Calendar Integration

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Library**
4. Search for "Google Calendar API" and enable it

### Step 2: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Add authorized redirect URI:
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/google-oauth-callback
   ```
5. Copy the **Client ID** and **Client Secret**

### Step 3: Set Secrets

```bash
# Set in Supabase Edge Functions
supabase secrets set GOOGLE_CLIENT_ID="your_client_id_here"
supabase secrets set GOOGLE_CLIENT_SECRET="your_client_secret_here"

# Set in your .env file (for frontend)
VITE_GOOGLE_CLIENT_ID="your_client_id_here"
```

### Step 4: Connect in App

1. Navigate to `/integrations` in your app
2. Click **Connect Google Calendar**
3. Authorize the app
4. Toggle "Enable Google Calendar Sync"

### How It Works

- When you stop a timer, it automatically creates a calendar event
- Events include: project name, description, start time, end time
- Changes to time entries update the calendar event
- Deleting an entry removes the calendar event

---

## Outlook Calendar Integration

### Step 1: Register Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Name: "TimeTrack Calendar Sync"
5. Redirect URI:
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/microsoft-oauth-callback
   ```

### Step 2: Configure Permissions

1. Go to **API permissions**
2. Add **Microsoft Graph** → **Delegated permissions**
3. Select: `Calendars.ReadWrite`, `offline_access`
4. Click **Grant admin consent**

### Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Copy the secret value immediately (won't be shown again!)

### Step 4: Set Secrets

```bash
# Set in Supabase
supabase secrets set MICROSOFT_CLIENT_ID="your_app_id_here"
supabase secrets set MICROSOFT_CLIENT_SECRET="your_secret_here"

# Set in .env
VITE_MICROSOFT_CLIENT_ID="your_app_id_here"
```

### Step 5: Connect in App

1. Navigate to `/integrations`
2. Click **Connect Outlook Calendar**
3. Sign in with Microsoft account
4. Toggle "Enable Outlook Calendar Sync"

---

## Slack Integration

### Step 1: Create Slack App

1. Go to [Slack API](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Name: "TimeTrack"
4. Choose your workspace

### Step 2: Add Slash Commands

1. Go to **Slash Commands** in the sidebar
2. Click **Create New Command**
3. Command: `/timer`
4. Request URL:
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/slack-commands
   ```
5. Short Description: "Control your TimeTrack timer"
6. Usage Hint: `[start|stop|status|today] [project] [description]`

### Step 3: Configure OAuth

1. Go to **OAuth & Permissions**
2. Add **Bot Token Scopes**: `chat:write`, `commands`
3. Add Redirect URL:
   ```
   https://YOUR_DOMAIN/auth/slack/callback
   ```

### Step 4: Set Secrets

```bash
supabase secrets set SLACK_CLIENT_ID="your_client_id"
supabase secrets set SLACK_CLIENT_SECRET="your_client_secret"

# In .env
VITE_SLACK_CLIENT_ID="your_client_id"
```

### Step 5: Install to Workspace

1. Navigate to `/integrations` in TimeTrack
2. Click **Add to Slack**
3. Authorize the app

### Available Commands

```
/timer start [project] [description]
  Example: /timer start Website Building homepage

/timer stop
  Stops the current timer

/timer status
  Shows current timer and elapsed time

/timer today
  Shows total time tracked today
```

---

## REST API Integration

See the **API** page (`/api`) in the app for:
- API key generation
- Complete endpoint documentation
- Code examples (JavaScript, Python, cURL)

### Quick Start

1. Navigate to `/api`
2. Generate an API key
3. Use it in your requests:

```bash
curl -X GET \
  https://YOUR_PROJECT.supabase.co/rest/v1/time_entries \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "apikey: YOUR_API_KEY"
```

---

## Import from Other Tools

### Toggl Track

1. Go to [Toggl Reports](https://track.toggl.com/reports)
2. Select **Detailed Report**
3. Choose date range
4. Click **Export** → **CSV**
5. Upload to `/import` in TimeTrack

### Clockify

1. Go to Clockify Reports → **Detailed Report**
2. Select "All time" or custom range
3. Click **Export** → **CSV**
4. Upload to `/import`

### Harvest

1. Go to Harvest Reports → **Time**
2. Select date range
3. Click **Export** → **CSV**
4. Upload to `/import`

---

## Troubleshooting

### Google Calendar Not Syncing

- Check if OAuth token is valid: `/integrations` should show "Connected"
- Verify Edge Function is deployed: `supabase functions list`
- Check function logs: `supabase functions logs google-oauth-callback`

### Outlook Calendar Errors

- Ensure app has `Calendars.ReadWrite` permission
- Check if admin consent was granted
- Verify redirect URI matches exactly

### Slack Commands Not Working

- Confirm slash command URL is correct
- Check Edge Function logs: `supabase functions logs slack-commands`
- Verify bot token scopes include `chat:write` and `commands`

### API Requests Failing

- Check if API key is still active
- Verify you're including both `Authorization` and `apikey` headers
- Check table RLS policies allow API key access

---

## Environment Variables Summary

Create a `.env` file in your project root:

```env
# Google Calendar
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# Microsoft Calendar
VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id

# Slack
VITE_SLACK_CLIENT_ID=your_slack_client_id
```

Supabase secrets (set via CLI):

```bash
supabase secrets set GOOGLE_CLIENT_ID=...
supabase secrets set GOOGLE_CLIENT_SECRET=...
supabase secrets set MICROSOFT_CLIENT_ID=...
supabase secrets set MICROSOFT_CLIENT_SECRET=...
supabase secrets set SLACK_CLIENT_ID=...
supabase secrets set SLACK_CLIENT_SECRET=...
```

---

## Security Best Practices

1. **Never commit secrets** to Git (use `.env` and `.gitignore`)
2. **Rotate API keys** regularly
3. **Use environment-specific** credentials (dev vs prod)
4. **Monitor OAuth token** expiry and refresh automatically
5. **Enable HTTPS** for all OAuth redirect URIs

---

## Need Help?

- Check Edge Function logs: `supabase functions logs <function-name>`
- View database logs: `supabase db logs`
- Test endpoints with cURL before integrating

---

## What's Next?

After setting up integrations:
- ✅ Time entries sync to your calendar automatically
- ✅ Control timer from Slack
- ✅ Build custom automations with the API
- ✅ Import all your historical data

Happy tracking! ⏱️
