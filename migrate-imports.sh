#!/bin/bash

echo "🔄 Migrating from Supabase to PostgreSQL..."
echo ""

# Backup old Supabase integration
if [ -d "src/integrations/supabase" ]; then
    echo "📦 Backing up old Supabase integration..."
    mv src/integrations/supabase src/integrations/supabase.backup
    echo "✅ Backup created at src/integrations/supabase.backup"
fi

# Update import paths in all TypeScript/TSX files
echo "🔧 Updating import paths..."

# Find all files with supabase imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 | while IFS= read -r -d '' file; do
    if grep -q "@/integrations/supabase/client" "$file" 2>/dev/null; then
        echo "   Updating: $file"
        # Use sed with backup on macOS
        sed -i '' 's|@/integrations/supabase/client|@/integrations/db/client|g' "$file"
    fi
done

echo "✅ Import paths updated"
echo ""

echo "📝 Migration complete!"
echo ""
echo "⚠️  Important: You need to:"
echo "   1. Run './setup.sh' to set up the PostgreSQL database"
echo "   2. Review authentication logic in src/contexts/AuthContext.tsx"
echo "   3. Test all features after migration"
echo ""
