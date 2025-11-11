#!/bin/bash

# Time Brutalist - Automated Migration Script
# This script links to your Supabase project and runs the migration

set -e  # Exit on error

echo "================================================"
echo "  Supabase Migration - Automated Setup"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Your Supabase project details
PROJECT_REF="dmsiccvhweqdpxbzbqig"
MIGRATION_FILE="supabase/migrations/20241111_initial_schema.sql"

echo -e "${YELLOW}Step 1: Checking Supabase CLI...${NC}"
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Install it with: brew install supabase/tap/supabase"
    exit 1
fi
echo -e "${GREEN}✅ Supabase CLI installed${NC}"
echo ""

echo -e "${YELLOW}Step 2: Linking to your project...${NC}"
echo "Project: $PROJECT_REF"
echo ""
echo -e "${YELLOW}⚠️  You'll need to enter your Supabase database password.${NC}"
echo "Find it at: https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo ""
read -p "Press Enter to continue..."

# Link to project
supabase link --project-ref $PROJECT_REF

echo ""
echo -e "${GREEN}✅ Project linked${NC}"
echo ""

echo -e "${YELLOW}Step 3: Running migration...${NC}"
echo "Migration file: $MIGRATION_FILE"
echo ""

# Run the migration
supabase db push

echo ""
echo -e "${GREEN}✅ Migration complete!${NC}"
echo ""

echo "================================================"
echo "  🎉 Database Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Refresh your app (Cmd+Shift+R)"
echo "2. Sign up at /signup"
echo "3. Your team will be created automatically"
echo "4. Start using all features!"
echo ""
