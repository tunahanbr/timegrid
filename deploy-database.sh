#!/bin/bash

echo "🚀 Deploying database schema to Supabase..."
echo ""
echo "This will:"
echo "  1. Connect to your remote Supabase database"
echo "  2. Apply all pending migrations"
echo "  3. Regenerate TypeScript types"
echo ""
echo "⏱️  This may take 30-60 seconds. Please don't interrupt!"
echo ""

# Apply migrations
echo "📤 Pushing migrations..."
supabase db push --linked

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Migration failed!"
    echo ""
    echo "Common fixes:"
    echo "  1. Check your internet connection"
    echo "  2. Verify Supabase project is accessible"
    echo "  3. Check supabase/config.toml has correct project_id"
    echo ""
    exit 1
fi

# Regenerate types
echo ""
echo "🔄 Regenerating TypeScript types..."
supabase gen types typescript --linked > src/integrations/supabase/types.ts

if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Type generation failed, but migrations succeeded."
    echo "You can regenerate types later with:"
    echo "  supabase gen types typescript --linked > src/integrations/supabase/types.ts"
    echo ""
    exit 0
fi

echo ""
echo "✅ Database deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "  1. Restart your dev server (if running)"
echo "  2. Refresh your browser"
echo "  3. Try creating a project again"
echo ""
