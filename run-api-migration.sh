#!/bin/bash

# API Keys Migration Script
# Run this to add API keys table for integrations

set -e  # Exit on error

echo "🔑 Running API Keys Migration..."
echo "================================"
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
echo "📤 Applying migration..."
supabase db push --include-all

echo ""
echo "✅ Migration complete!"
echo ""
echo "🔄 Regenerating TypeScript types..."
supabase gen types typescript --linked > src/integrations/supabase/types.ts

echo ""
echo "✨ All done! API Keys table is ready."
echo ""
echo "Next steps:"
echo "  1. Navigate to /api in your app"
echo "  2. Create an API key"
echo "  3. Use it for integrations"
echo ""
