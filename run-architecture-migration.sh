#!/bin/bash

# Per-Project Architecture Migration Script
echo "======================================"
echo "Per-Project Architecture Migration"
echo "======================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Project not linked yet."
    echo ""
    echo "Let's link your Supabase project..."
    echo ""
    read -p "Enter your project ID (e.g., dmsiccvhweqdpxbzbqig): " PROJECT_ID
    
    supabase link --project-ref "$PROJECT_ID"
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to link project"
        exit 1
    fi
fi

echo "✅ Project linked successfully"
echo ""
echo "This migration will:"
echo "  • Add project_members table for per-project team access"
echo "  • Add project_invitations table for invitation system"
echo "  • Add settings column to users table for feature toggles"
echo "  • Migrate existing team members to project members"
echo "  • Update all RLS policies for project-based access"
echo ""
echo "⚠️  IMPORTANT: This is a major architecture change"
echo "   Make sure you have a backup of your database!"
echo ""
read -p "Continue with migration? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Migration cancelled"
    exit 0
fi

echo ""
echo "Running migration..."
echo ""

# Run the migration
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Restart your development server"
    echo "  2. Refresh the app in your browser"
    echo "  3. Go to Settings to choose your user mode"
    echo "  4. Try creating a project and sharing it"
    echo ""
    echo "New features available:"
    echo "  • Per-project team members"
    echo "  • Feature toggles (disable clients/invoicing if not needed)"
    echo "  • User modes (Personal, Freelancer, Team)"
    echo "  • Project invitations"
    echo ""
else
    echo ""
    echo "❌ Migration failed"
    echo "Check the error messages above"
    exit 1
fi
