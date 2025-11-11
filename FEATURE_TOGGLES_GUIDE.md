# How to Toggle Features On/Off

## Quick Start

1. **Navigate to Settings**
   - Click "Settings" in the sidebar (bottom section)

2. **Choose Your Mode**
   Pick one of three presets:
   
   - **🧘 Personal** - Just tracking your own time
     - Shows: Timer, Projects, Tags, Reports
     - Hides: Clients, Invoices, Team
   
   - **💼 Freelancer** - Billing clients (default)
     - Shows: Everything except Team
     - Perfect for solo freelancers
   
   - **👥 Team/Agency** - Team collaboration
     - Shows: All features including Team

3. **Or Customize Individual Features**
   Toggle specific features on/off:
   - ✓ Clients Management
   - ✓ Invoicing
   - ✓ Tags
   - ✓ Reports & Analytics
   - ✓ Team Collaboration

4. **Save Changes**
   - Click "Save Changes" button
   - Refresh the page to see updated navigation

## What Happens When You Disable Features?

### Disable "Clients"
- ❌ "Clients" menu item disappears
- ❌ Can't create/manage clients
- ✅ Projects still work (just without client linking)

### Disable "Invoicing"
- ❌ "Invoices" menu item disappears
- ❌ Can't generate invoices
- ✅ Time tracking still works normally

### Disable "Tags"
- ❌ "Tags" menu item disappears
- ❌ Can't add tags to entries
- ✅ Timer and entries still work

### Disable "Reports"
- ❌ "Dashboard" menu item disappears
- ❌ Can't view analytics
- ✅ Basic time tracking still works

### Disable "Team"
- ❌ "Team" section disappears completely
- ❌ Can't manage team members
- ✅ You still see all your own projects

## Use Case Examples

### Personal Productivity Tracking
```
Mode: Personal
Enabled: Timer, Projects, Tags, Reports
Disabled: Clients, Invoicing, Team

Perfect for tracking personal work, side projects, learning time
```

### Solo Freelancer
```
Mode: Freelancer
Enabled: Everything except Team
Disabled: Team

Track time for multiple clients, generate invoices, work solo
```

### Agency Owner
```
Mode: Team
Enabled: Everything
Disabled: Nothing

Full team collaboration with all business features
```

### Minimalist (Just Timer)
```
Mode: Personal
Enabled: Timer, Projects
Disabled: Everything else

Simplest possible setup - just start/stop timers
```

## Current Implementation

- ✅ Settings page with mode selection
- ✅ Individual feature toggles
- ✅ Navigation respects settings
- ✅ Changes persist in localStorage
- ⚠️ Requires page refresh to update navigation

## Future Enhancements

After database migration:
- Settings will sync to Supabase
- No page refresh needed
- Settings sync across devices
- Onboarding flow for new users

## Storage Location

Currently stored in browser localStorage:
- `timetrack_feature_settings` - Feature flags
- `timetrack_user_mode` - Selected mode (personal/freelancer/team)

After refresh, sidebar will show/hide menu items based on these settings.
