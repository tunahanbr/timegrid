# 🚀 Quick Reference Card

## 📁 New Files at a Glance

### Pages
```
src/pages/
├── DashboardPage.tsx      ⭐ NEW - Analytics & Charts
├── LoginPage.tsx          ⭐ NEW - Authentication
├── SignUpPage.tsx         ⭐ NEW - User Registration
└── EntriesPage.tsx        ✏️  ENHANCED - Filters & Export
```

### Components
```
src/components/
├── FilterBar.tsx          ⭐ NEW - Advanced Filtering
└── ProtectedRoute.tsx     ⭐ NEW - Route Protection
```

### Context
```
src/contexts/
└── AuthContext.tsx        ⭐ NEW - Global Auth State
```

### Database
```
supabase/migrations/
└── 20241111_initial_schema.sql  ⭐ NEW - Complete DB Schema
```

### Documentation
```
./
├── IMPLEMENTATION_GUIDE.md      ⭐ NEW - Full Setup Guide
├── IMPLEMENTATION_SUMMARY.md    ⭐ NEW - Work Log
├── MIGRATION_GUIDE.md           ⭐ NEW - Supabase Migration
├── WHATS_BEEN_BUILT.md         ⭐ NEW - Feature Summary
├── .env.example                 ⭐ NEW - Config Template
└── README.md                    ✏️  UPDATED
```

---

## 🎯 Key Features Locations

### Dashboard Analytics
- **File**: `src/pages/DashboardPage.tsx`
- **Route**: `/dashboard`
- **Features**: Line chart, pie chart, stats cards, time range toggle

### Filter System
- **Component**: `src/components/FilterBar.tsx`
- **Used In**: `src/pages/EntriesPage.tsx`
- **Features**: Date range, project multi-select, tag filter, active badges

### CSV Export
- **Location**: `src/pages/EntriesPage.tsx` (lines ~75-110)
- **Function**: `exportToCSV()`
- **Trigger**: Export button in entries page header

### Authentication
- **Context**: `src/contexts/AuthContext.tsx`
- **Login**: `src/pages/LoginPage.tsx` → `/login`
- **Signup**: `src/pages/SignUpPage.tsx` → `/signup`
- **Protected**: `src/components/ProtectedRoute.tsx`

### Database Schema
- **File**: `supabase/migrations/20241111_initial_schema.sql`
- **Tables**: 9 (users, teams, projects, clients, time_entries, tags, invoices, etc.)
- **Security**: RLS policies for all tables

---

## ⚡ Quick Commands

### Development
```bash
bun run dev              # Start dev server
bun run build            # Build for production
bun run preview          # Preview production build
bun run lint             # Run ESLint
```

### Supabase (when ready)
```bash
supabase init            # Initialize Supabase
supabase start           # Start local Supabase
supabase db push         # Push migrations
supabase db reset        # Reset database
```

---

## 🎨 Component Props

### FilterBar
```typescript
<FilterBar
  filters={filters}              // FilterState object
  onFiltersChange={setFilters}   // Update callback
  projects={projects}            // Project[] array
  availableTags={tags}           // string[] array
/>
```

### ProtectedRoute
```typescript
<ProtectedRoute>
  <YourComponent />              // Wraps protected content
</ProtectedRoute>
```

---

## 🗄️ Database Tables Quick Ref

```
users          → User profiles with roles
teams          → Organization grouping  
projects       → Projects with rates & clients
clients        → Client information
time_entries   → Time tracking records
tags           → Categorization tags
entry_tags     → Entry-tag junction
invoices       → Invoice headers
invoice_items  → Invoice line items
```

---

## 🔐 User Roles

```typescript
'admin'            → Full system access
'project_manager'  → Team & project management
'user'             → Own time tracking only
```

---

## 📊 Chart Types

### Dashboard Charts
1. **Line Chart** - Daily time trend (Recharts LineChart)
2. **Pie Chart** - Project distribution (Recharts PieChart)
3. **Bar Chart** - Project breakdown (HTML/CSS)

---

## 🎯 FilterState Interface

```typescript
interface FilterState {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  projectIds: string[];
  tags: string[];
}
```

---

## 📥 CSV Export Fields

```
Date                  → YYYY-MM-DD
Project               → Project name
Description           → Entry description
Tags                  → Comma-separated tags
Duration (hours)      → Decimal (e.g., 2.50)
Duration (formatted)  → Human readable (e.g., 2h 30m)
```

---

## 🚦 Auth Flow

```
1. User visits protected route
2. ProtectedRoute checks auth state
3. If not authenticated → redirect to /login
4. User logs in → Auth context updates
5. ProtectedRoute allows access
6. User data available via useAuth()
```

---

## 🎨 Theme Classes

```css
bg-background       → Main background
bg-surface         → Card backgrounds
text-foreground    → Primary text
text-muted-foreground → Secondary text
border-border      → Border colors
text-primary       → Brand color
text-destructive   → Delete/error actions
```

---

## 📱 Responsive Breakpoints

```
sm: 640px   → Small devices
md: 768px   → Tablets
lg: 1024px  → Laptops
xl: 1280px  → Desktops
2xl: 1536px → Large screens
```

---

## 🔧 Environment Variables

```env
VITE_SUPABASE_URL                → Supabase project URL
VITE_SUPABASE_PUBLISHABLE_KEY    → Supabase anon key
```

---

## 📈 Performance Tips

1. **Memoize expensive calculations** → `useMemo()`
2. **Lazy load charts** → Dynamic imports
3. **Debounce filters** → Reduce API calls
4. **Virtual scrolling** → For 1000+ entries
5. **Optimize images** → Use WebP format

---

## 🐛 Debug Helpers

### Check Auth State
```typescript
const { user, session, loading } = useAuth();
console.log({ user, session, loading });
```

### Check Filters
```typescript
console.log('Active filters:', filters);
console.log('Filtered entries:', filteredEntries.length);
```

### Check Supabase Connection
```typescript
const { data, error } = await supabase.from('projects').select('*');
console.log({ data, error });
```

---

## 🎓 Learn More

| Topic | File |
|-------|------|
| Setup Instructions | IMPLEMENTATION_GUIDE.md |
| Migration Steps | MIGRATION_GUIDE.md |
| Implementation Details | IMPLEMENTATION_SUMMARY.md |
| Feature Overview | WHATS_BEEN_BUILT.md |
| Quick Start | README.md |

---

## ✨ Code Snippets

### Add New Filter
```typescript
// 1. Extend FilterState
interface FilterState {
  // ... existing
  myNewFilter: string[];
}

// 2. Add to FilterBar
<Button onClick={() => handleMyFilter()}>
  My Filter
</Button>

// 3. Use in filter logic
const filtered = entries.filter(entry => {
  if (filters.myNewFilter.length > 0) {
    return filters.myNewFilter.includes(entry.myField);
  }
  return true;
});
```

### Add New Chart
```typescript
import { BarChart, Bar, XAxis, YAxis } from "recharts";

<ResponsiveContainer width="100%" height={300}>
  <BarChart data={myData}>
    <XAxis dataKey="name" />
    <YAxis />
    <Bar dataKey="value" fill="hsl(var(--primary))" />
  </BarChart>
</ResponsiveContainer>
```

### Protected API Call
```typescript
import { supabase } from "@/integrations/supabase/client";

const { data, error } = await supabase
  .from('time_entries')
  .select('*')
  .eq('user_id', user.id);
```

---

## 🎯 Common Tasks

### Add a New Page
1. Create `src/pages/MyPage.tsx`
2. Add route in `src/App.tsx`
3. Add nav link in `src/components/AppSidebar.tsx`
4. Import icon from `lucide-react`

### Add a New Component
1. Create `src/components/MyComponent.tsx`
2. Export default function
3. Import in parent component
4. Add props interface if needed

### Add Database Table
1. Write SQL in new migration file
2. Add RLS policies
3. Create indexes for foreign keys
4. Test in Supabase SQL Editor

---

**Last Updated**: November 11, 2025
**Version**: 1.0.0
**Status**: Phase 3 (60% Complete)

---

*Keep this card handy for quick reference during development!* 📌
