# Time Brutalist - Advanced Time Tracking Application

A modern, feature-rich time tracking application built with React, TypeScript, Tailwind CSS, and Supabase.

## 🚀 Features Implemented

### Phase 1: Quick Wins ✅
- ⌨️ Keyboard shortcuts for quick actions
- ⚡ Quick manual entry form
- 🎯 Timer with pause/resume functionality
- 📊 Project and tag management

### Phase 2: Reporting ✅
- 📈 **Dashboard with Interactive Charts**
  - Project time distribution (Pie chart)
  - Daily/weekly time trends (Line chart)
  - Project breakdown with percentages
  - Key statistics (total time, daily average, entries count)
  - Week/Month view toggle

- 🔍 **Advanced Filtering System**
  - Date range picker with calendar interface
  - Project filtering with multi-select
  - Tag-based filtering
  - Active filters display with quick removal
  - Reusable FilterBar component

- 📥 **Enhanced CSV Export**
  - Export filtered time entries
  - Includes all relevant fields (date, project, description, tags, duration)
  - Formatted duration and decimal hours
  - Download with timestamped filename

### Phase 3: Team & Backend (In Progress) 🚧
- 🔐 **Authentication System**
  - Supabase Auth integration
  - Login/Signup pages with validation
  - Protected routes
  - Session management
  - Auth context with React Context API

- 🗄️ **Database Schema**
  - Users table with role support
  - Teams table for organization
  - Projects with client linkage and hourly rates
  - Time entries with team support
  - Clients management
  - Tags with team scoping
  - Invoices and invoice items
  - Row Level Security (RLS) policies
  - Optimized indexes

- 👥 **Roles System**
  - Admin: Full system access
  - Project Manager: Team and project management
  - User: Own time tracking

### Phase 4: Billing (Planned) 📋
- 💰 Hourly rates per project
- 📑 Invoice generation with PDF export
- 👔 Client management system
- 💵 Revenue tracking and reports

### Phase 5: Integrations (Planned) 🔌
- 📅 Calendar sync (Google Calendar, iCal)
- 🔧 Productivity tool integrations
- 🌐 Browser extensions
- 🔗 REST API & webhooks

## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui components
- **Charts**: Recharts
- **Backend**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Routing**: React Router v6
- **State Management**: React Query, Context API
- **Forms**: React Hook Form, Zod validation
- **Date**: date-fns
- **Icons**: Lucide React

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd time-brutalist
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

4. Initialize Supabase (if using local development):
```bash
supabase init
supabase start
```

5. Run the database migrations:
```bash
supabase db push
```

Or manually run the migration SQL in your Supabase dashboard:
- Go to SQL Editor
- Run the file: `supabase/migrations/20241111_initial_schema.sql`

6. Start the development server:
```bash
bun run dev
```

## 🎯 Usage

### For Local-Only Mode (Current Default)
The app currently uses localStorage for data persistence. No authentication required.

1. **Timer Page**: Start/stop/pause timer for projects
2. **Dashboard**: View analytics and charts
3. **Entries**: Browse, filter, and export time entries
4. **Projects**: Manage projects with colors
5. **Tags**: Create and manage tags

### To Enable Multi-User Mode

Update `src/App.tsx` to wrap the app with `AuthProvider` and protect routes:

```tsx
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Wrap the app
<AuthProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout>
                {/* Your routes */}
              </AppLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
</AuthProvider>
```

## 🗄️ Database Schema

### Core Tables
- **users**: User profiles with roles (admin, project_manager, user)
- **teams**: Organization/team grouping
- **projects**: Project tracking with hourly rates and client linkage
- **time_entries**: Individual time tracking records
- **clients**: Client information for billing
- **tags**: Categorization tags
- **invoices**: Invoice generation and tracking
- **invoice_items**: Line items for invoices

### Security
All tables have Row Level Security (RLS) enabled with policies:
- Users can only view/edit their own data
- Team members can view shared team data
- Admins and Project Managers have elevated permissions

## 🎨 Customization

### Adding a New Chart Type
1. Create component in `src/components/charts/`
2. Use Recharts components
3. Import and use in DashboardPage

### Adding New Filters
1. Extend `FilterState` interface in `FilterBar.tsx`
2. Add new filter UI in FilterBar component
3. Update filter logic in pages using FilterBar

## 🧪 Testing

```bash
# Run tests (when implemented)
bun run test

# Type checking
bun run typecheck

# Linting
bun run lint
```

## 📊 Project Structure

```
time-brutalist/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── FilterBar.tsx   # Advanced filtering
│   │   ├── Timer.tsx       # Timer component
│   │   └── ...
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx
│   ├── pages/              # Page components
│   │   ├── DashboardPage.tsx
│   │   ├── EntriesPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── ...
│   ├── lib/                # Utilities
│   │   ├── storage.ts      # localStorage utilities
│   │   ├── utils-time.ts   # Time formatting
│   │   └── utils.ts
│   ├── integrations/       # Third-party integrations
│   │   └── supabase/
│   └── hooks/              # Custom React hooks
├── supabase/
│   ├── migrations/         # Database migrations
│   └── config.toml
└── public/
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Development Roadmap

- [x] Phase 1: Basic timer and quick entry
- [x] Phase 2: Dashboard and reporting
- [ ] Phase 3: Complete authentication integration
- [ ] Phase 3: Team collaboration features
- [ ] Phase 4: Billing and invoicing
- [ ] Phase 5: External integrations
- [ ] Phase 5: Mobile app (React Native)
- [ ] Phase 5: Desktop app (Electron)

## 🐛 Known Issues

- TypeScript compilation errors are cosmetic (modules exist but types not fully resolved)
- Badge component needs type adjustments for children prop
- Calendar component DateRange type needs refinement

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Recharts](https://recharts.org/) for charting capabilities
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Lucide](https://lucide.dev/) for icons

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue](<repository-url>/issues)
- Email: support@example.com

---

Built with ❤️ using modern web technologies
