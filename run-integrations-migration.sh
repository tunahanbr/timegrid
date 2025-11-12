#!/bin/bash

# Integrations Migration Script
# Run this to set up calendar sync, OAuth, and Slack integration

set -e  # Exit on error

echo "🔌 Running Integrations Migration..."
echo "===================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed"
    echo "Install it with: brew install supabase/tap/supabase"
    exit 1
fi

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "❌ Error: No Supabase project linked"
    echo "Run: supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

# Run the migration
echo "📤 Applying integrations migration..."
supabase db push --include-all

echo ""
echo "✅ Database migration complete!"
echo ""

# Deploy Edge Functions
echo "🚀 Deploying Edge Functions..."
echo ""

if [ -d "supabase/functions/google-oauth-callback" ]; then
    echo "  📦 Deploying google-oauth-callback..."
    supabase functions deploy google-oauth-callback --no-verify-jwt
fi

if [ -d "supabase/functions/microsoft-oauth-callback" ]; then
    echo "  📦 Deploying microsoft-oauth-callback..."
    supabase functions deploy microsoft-oauth-callback --no-verify-jwt
fi

if [ -d "supabase/functions/sync-calendar" ]; then
    echo "  📦 Deploying sync-calendar..."
    supabase functions deploy sync-calendar
fi

if [ -d "supabase/functions/slack-commands" ]; then
    echo "  📦 Deploying slack-commands..."
    supabase functions deploy slack-commands --no-verify-jwt
fi

echo ""
echo "🔄 Regenerating TypeScript types..."
supabase gen types typescript --linked > src/integrations/supabase/types.ts

echo ""
echo "✨ All done! Integrations are ready."
echo ""
echo "📋 Next steps:"
echo ""
echo "1. GOOGLE CALENDAR SETUP:"
echo "   • Go to: https://console.cloud.google.com/"
echo "   • Create a new project"
echo "   • Enable Google Calendar API"
echo "   • Create OAuth 2.0 credentials"
echo "   • Add redirect URI: YOUR_DOMAIN/functions/v1/google-oauth-callback"
echo "   • Set secrets:"
echo "     supabase secrets set GOOGLE_CLIENT_ID=your_client_id"
echo "     supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret"
echo "   • Add VITE_GOOGLE_CLIENT_ID to your .env file"
echo ""
echo "2. MICROSOFT CALENDAR SETUP:"
echo "   • Go to: https://portal.azure.com/"
echo "   • Register an application"
echo "   • Add Calendars.ReadWrite permission"
echo "   • Add redirect URI: YOUR_DOMAIN/functions/v1/microsoft-oauth-callback"
echo "   • Set secrets:"
echo "     supabase secrets set MICROSOFT_CLIENT_ID=your_client_id"
echo "     supabase secrets set MICROSOFT_CLIENT_SECRET=your_client_secret"
echo "   • Add VITE_MICROSOFT_CLIENT_ID to your .env file"
echo ""
echo "3. SLACK INTEGRATION SETUP:"
echo "   • Go to: https://api.slack.com/apps"
echo "   • Create a new app"
echo "   • Add slash command: /timer"
echo "   • Request URL: YOUR_DOMAIN/functions/v1/slack-commands"
echo "   • Add OAuth scope: chat:write, commands"
echo "   • Set secrets:"
echo "     supabase secrets set SLACK_CLIENT_ID=your_client_id"
echo "     supabase secrets set SLACK_CLIENT_SECRET=your_client_secret"
echo "   • Add VITE_SLACK_CLIENT_ID to your .env file"
echo ""
echo "4. Navigate to /integrations in your app to connect!"
echo ""
