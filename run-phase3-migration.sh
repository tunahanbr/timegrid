#!/bin/bash

echo "🚀 Running Phase 3 Migration (Advanced Features)..."
echo ""

# Run the migration
echo "📊 Running database migration..."
supabase db push --include-all

# Regenerate types
echo "🔄 Regenerating TypeScript types..."
supabase gen types typescript --linked > src/integrations/supabase/types.ts

echo ""
echo "✅ Phase 3 migration complete!"
echo ""
echo "📝 What was added:"
echo "  - project_budgets table (budget tracking per project)"
echo "  - expenses table (expense tracking with receipts)"
echo "  - currency_rates table (multi-currency support)"
echo "  - recurring_invoices table (automated invoice generation)"
echo "  - Currency column added to projects and invoices"
echo ""
echo "🎨 New pages available:"
echo "  - /budgets - Track project budgets and spending"
echo "  - /expenses - Record and manage expenses"
echo ""
echo "📚 Next steps:"
echo "  1. Visit /budgets to set project budgets"
echo "  2. Visit /expenses to start tracking expenses"
echo "  3. Update your project hourly rates for accurate budget calculations"
echo ""
echo "💡 Tip: Budgets will alert you when spending approaches the threshold!"
echo ""
