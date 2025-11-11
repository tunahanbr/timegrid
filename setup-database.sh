#!/bin/bash

# Time Brutalist - Database Setup Script
# This script helps you run the database migration in Supabase

echo "================================================"
echo "  Time Brutalist - Database Setup"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 This script will guide you through setting up your database.${NC}"
echo ""

# Check if migration file exists
if [ ! -f "supabase/migrations/20241111_initial_schema.sql" ]; then
    echo -e "${RED}❌ Migration file not found!${NC}"
    echo "Expected: supabase/migrations/20241111_initial_schema.sql"
    exit 1
fi

echo -e "${GREEN}✅ Migration file found${NC}"
echo ""

echo "================================================"
echo "  Setup Instructions"
echo "================================================"
echo ""

echo "1️⃣  Open Supabase Dashboard:"
echo "   👉 https://supabase.com/dashboard"
echo ""

echo "2️⃣  Select your project:"
echo "   👉 Project ID: dmsiccvhweqdpxbzbqig"
echo ""

echo "3️⃣  Open SQL Editor:"
echo "   - Click 'SQL Editor' in the left sidebar"
echo "   - Click 'New query' button"
echo ""

echo "4️⃣  Run the migration:"
echo "   - Copy the contents of: supabase/migrations/20241111_initial_schema.sql"
echo "   - Paste into the SQL Editor"
echo "   - Click 'Run' (or press Cmd/Ctrl + Enter)"
echo ""

echo "5️⃣  Verify success:"
echo "   You should see: 'Success. No rows returned'"
echo ""

echo "================================================"
echo "  What Will Be Created"
echo "================================================"
echo ""

echo "📊 9 Database Tables:"
echo "   ✅ users - User profiles with roles"
echo "   ✅ teams - Team/workspace management"
echo "   ✅ projects - Time tracking projects"
echo "   ✅ clients - Client management"
echo "   ✅ time_entries - Time tracking records"
echo "   ✅ tags - Entry categorization"
echo "   ✅ entry_tags - Tag associations"
echo "   ✅ invoices - Invoice tracking"
echo "   ✅ invoice_items - Invoice line items"
echo ""

echo "🔐 Security Features:"
echo "   ✅ Row Level Security (RLS) on all tables"
echo "   ✅ Role-based access policies"
echo "   ✅ Team data isolation"
echo ""

echo "⚡ Performance Features:"
echo "   ✅ Database indexes"
echo "   ✅ Auto-updating timestamps"
echo "   ✅ Foreign key constraints"
echo ""

echo "================================================"
echo "  After Migration"
echo "================================================"
echo ""

echo "1. Refresh your app (Cmd/Ctrl + Shift + R)"
echo "2. Sign up at /signup"
echo "3. Your team will be created automatically"
echo "4. You'll become admin of your team"
echo ""

echo "================================================"
echo "  Need Help?"
echo "================================================"
echo ""

echo "Check these files for detailed instructions:"
echo "   📄 SETUP_DATABASE.md"
echo "   📄 FIX_404_ERRORS.md"
echo ""

echo -e "${GREEN}Ready to proceed? Follow steps 1-5 above! 🚀${NC}"
echo ""
