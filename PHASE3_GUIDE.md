# Phase 3: Advanced Features Guide

This guide covers the Phase 3 implementation: Budget Tracking, Expense Management, Multi-Currency Support, and Recurring Invoices.

## 🎯 Features Implemented

### 1. Budget Tracking (`/budgets`)
- **Set project budgets** with amount, currency, and time period
- **Real-time progress tracking** based on time entries
- **Alert thresholds** - Get warned when approaching budget limits
- **Visual indicators** - Color-coded progress bars (green/yellow/red)
- **Multiple periods** - Monthly, Quarterly, Yearly, or Total Project budgets

### 2. Expense Management (`/expenses`)
- **Track all expenses** with amount, category, and date
- **Receipt attachments** - Store receipt URLs for documentation
- **Project linking** - Associate expenses with specific projects
- **Billable tracking** - Mark expenses as billable to clients
- **Filtering** - Filter by project or category
- **Summary cards** - See total, billable, and count at a glance

### 3. Multi-Currency Support
- **6 supported currencies**: USD, EUR, GBP, JPY, CAD, AUD
- **Exchange rates table** - Store historical rates for accurate conversions
- **Project-level currency** - Set default currency per project
- **Invoice currency** - Generate invoices in any supported currency
- **Expense currency** - Track expenses in their original currency

### 4. Database Schema

#### `project_budgets`
```sql
- id: UUID (primary key)
- project_id: UUID (foreign key to projects)
- amount: DECIMAL(10,2) - Budget amount
- currency: TEXT - Budget currency (default: USD)
- period: TEXT - 'monthly', 'quarterly', 'yearly', 'total'
- start_date: DATE - Budget period start
- end_date: DATE - Budget period end
- alert_threshold: DECIMAL(5,2) - Alert at X% (default: 80)
- created_at, updated_at: TIMESTAMP
```

#### `expenses`
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- project_id: UUID (optional foreign key to projects)
- amount: DECIMAL(10,2) - Expense amount
- currency: TEXT - Expense currency (default: USD)
- category: TEXT - Expense category
- description: TEXT (optional)
- receipt_url: TEXT (optional) - URL to receipt image/PDF
- expense_date: DATE - When expense occurred
- is_billable: BOOLEAN - Can be billed to client
- created_at, updated_at: TIMESTAMP
```

#### `currency_rates`
```sql
- id: UUID (primary key)
- from_currency: TEXT - Source currency
- to_currency: TEXT - Target currency
- rate: DECIMAL(10,6) - Exchange rate
- date: DATE - Rate effective date
- UNIQUE(from_currency, to_currency, date)
```

#### `recurring_invoices`
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- client_id: UUID (foreign key to clients)
- amount: DECIMAL(10,2)
- currency: TEXT
- frequency: TEXT - 'weekly', 'monthly', 'quarterly', 'yearly'
- next_run_date: DATE - When to generate next invoice
- last_run_date: DATE - When last invoice was generated
- is_active: BOOLEAN - Enable/pause recurring
- description: TEXT
- created_at, updated_at: TIMESTAMP
```

## 🚀 Setup Instructions

### 1. Run the Migration

```bash
# Option A: Use the provided script
./run-phase3-migration.sh

# Option B: Run manually
supabase db push --include-all
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

### 2. Set Project Hourly Rates

For accurate budget tracking, set hourly rates for your projects:

1. Go to **Projects** page
2. Edit each project
3. Set the **Hourly Rate** field
4. Budget calculations will use this rate to estimate spending

### 3. Seed Currency Rates (Optional)

The migration includes default rates, but you can add more:

```sql
INSERT INTO currency_rates (from_currency, to_currency, rate, date) VALUES
('USD', 'INR', 83.12, CURRENT_DATE),
('EUR', 'INR', 89.50, CURRENT_DATE),
('GBP', 'INR', 104.30, CURRENT_DATE);
```

## 📖 User Guide

### Setting Up Budgets

1. Navigate to **Budgets** page
2. Click **Set Budget**
3. Fill in the form:
   - **Project**: Select which project to budget
   - **Budget Amount**: Enter the budget amount
   - **Currency**: Choose the currency
   - **Budget Period**: Monthly, Quarterly, Yearly, or Total
   - **Alert Threshold**: When to warn (default: 80%)
4. Click **Create Budget**

**Budget Calculation:**
- Budgets track spending based on logged time entries
- Spent = (Total Hours × Project Hourly Rate)
- Progress = (Spent / Budget) × 100%
- Alerts trigger when progress exceeds threshold

### Recording Expenses

1. Navigate to **Expenses** page
2. Click **Add Expense**
3. Fill in the form:
   - **Amount**: Expense amount
   - **Currency**: Currency of the expense
   - **Category**: Select from predefined categories
   - **Date**: When the expense occurred
   - **Project**: (Optional) Associate with a project
   - **Description**: Additional details
   - **Receipt URL**: Link to uploaded receipt
   - **Billable**: Check if this should be billed to client
4. Click **Add Expense**

**Expense Categories:**
- Travel
- Meals
- Accommodation
- Office Supplies
- Software
- Equipment
- Consulting
- Marketing
- Other

### Filtering and Searching

**Budgets Page:**
- View all project budgets at a glance
- See progress bars with color indicators
- Get alerts when approaching limits
- Edit or delete budgets as needed

**Expenses Page:**
- Filter by Project to see project-specific expenses
- Filter by Category to group similar expenses
- View summary cards showing totals
- Track billable vs non-billable expenses

### Receipt Management

To attach receipts to expenses:

1. Upload your receipt to cloud storage (e.g., Cloudinary, S3, Imgur)
2. Copy the public URL
3. Paste the URL in the **Receipt URL** field
4. Click **View Receipt** on the expense to open in new tab

**Recommended Receipt Storage Services:**
- Cloudinary (free tier available)
- AWS S3
- Google Cloud Storage
- Imgur
- Dropbox

## 🎨 UI Features

### Budget Cards
- **Status Badge**: On Track / Warning / Over Budget
- **Progress Bar**: Visual representation with color coding
- **Alert Messages**: Context-specific warnings
- **Edit/Delete**: Quick actions for budget management

### Expense List
- **Summary Cards**: Total, Billable, Count
- **Filtering**: Project and Category filters
- **Receipt Links**: Quick access to receipts
- **Billable Badges**: Clear indication of billable status
- **Project Association**: See which project each expense belongs to

## 🔐 Security (RLS Policies)

All tables have Row Level Security enabled:

- **project_budgets**: Users can only see/edit budgets for their own projects
- **expenses**: Users can only see/edit their own expenses
- **currency_rates**: Read-only for all authenticated users
- **recurring_invoices**: Users can only see/edit their own recurring invoices

## 🧪 Testing Checklist

### Budgets
- [ ] Create a budget for a project
- [ ] Log time entries for that project
- [ ] Verify budget progress updates automatically
- [ ] Test alert threshold (set to 50% and exceed it)
- [ ] Edit budget amount and see recalculation
- [ ] Delete a budget

### Expenses
- [ ] Create expense with all fields
- [ ] Create expense with minimal fields (amount + category only)
- [ ] Mark expense as billable
- [ ] Associate expense with a project
- [ ] Add receipt URL and verify link opens
- [ ] Filter by project
- [ ] Filter by category
- [ ] Edit an expense
- [ ] Delete an expense

### Multi-Currency
- [ ] Create budget in EUR
- [ ] Create expense in GBP
- [ ] Verify currency displays correctly
- [ ] Test currency selector in all forms

## 🐛 Troubleshooting

### "Table does not exist" errors
**Solution**: Run the migration script to create the tables.

### Budget not updating
**Problem**: Time entries not associated with the project.
**Solution**: Ensure time entries have the correct `project_id`.

### Budget calculation seems wrong
**Problem**: Project hourly rate not set or incorrect.
**Solution**: 
1. Go to Projects page
2. Edit the project
3. Set a realistic hourly rate

### Receipt upload not working
**Problem**: No built-in file upload (by design).
**Solution**: Use external storage service and paste URL.

### Currency conversion not happening
**Note**: This is intentional. Currency conversions are for display/reporting only. Each amount is stored in its original currency.

## 📊 Future Enhancements (Not Yet Implemented)

These are potential additions for future phases:

### Budget Features
- [ ] Budget rollover (unused budget to next period)
- [ ] Budget templates (copy from previous periods)
- [ ] Budget comparison (actual vs planned)
- [ ] Budget forecasting based on historical data
- [ ] Email alerts when threshold exceeded

### Expense Features
- [ ] Direct file upload for receipts
- [ ] OCR to extract expense details from receipts
- [ ] Expense approval workflow
- [ ] Mileage tracking and reimbursement
- [ ] Expense reports export to PDF

### Currency Features
- [ ] Live exchange rate API integration
- [ ] Automatic daily rate updates
- [ ] Currency conversion calculator
- [ ] Multi-currency invoice totals
- [ ] Historical rate charts

### Recurring Invoices
- [ ] Automatic invoice generation
- [ ] Email notification to clients
- [ ] Auto-pause after X invoices
- [ ] Variable amounts (e.g., based on time tracked)
- [ ] Cron job to run daily check

## 🎓 Best Practices

### Budget Management
1. **Set realistic budgets** based on historical data
2. **Review weekly** to catch overruns early
3. **Adjust rates** as project scope changes
4. **Use monthly budgets** for better tracking
5. **Set alerts at 75-80%** for adequate warning time

### Expense Tracking
1. **Record expenses immediately** to avoid forgetting
2. **Always attach receipts** for audit trail
3. **Use consistent categories** for better reporting
4. **Mark billable expenses** at time of entry
5. **Review expenses weekly** to ensure completeness

### Currency Management
1. **Update exchange rates monthly** for accuracy
2. **Use base currency** (USD) for reporting
3. **Document exchange rates** used for invoices
4. **Keep historical rates** for auditing
5. **Be consistent** with currency choices per client

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify the migration ran successfully
3. Check browser console for errors
4. Ensure Supabase connection is working
5. Review RLS policies if data isn't showing

## 🔄 Migration Rollback

If you need to rollback Phase 3:

```sql
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS recurring_invoices CASCADE;
DROP TABLE IF EXISTS currency_rates CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS project_budgets CASCADE;

-- Remove currency columns (optional)
ALTER TABLE projects DROP COLUMN IF EXISTS currency;
ALTER TABLE invoices DROP COLUMN IF EXISTS currency;
```

**Warning**: This will delete all budget and expense data. Backup first!

---

**Phase 3 Implementation**: Budget Tracking, Expense Management, Multi-Currency Support
**Status**: ✅ Complete and Ready to Use
**Next**: Run migration and start tracking budgets/expenses!
