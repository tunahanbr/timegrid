# Time Tracking Application - PostgreSQL Migration

## Overview

This application has been migrated from Supabase to a self-hosted PostgreSQL database running in Docker. All functionality has been preserved.

## Prerequisites

- Docker Desktop installed and running
- Bun (or npm/yarn) installed

## Quick Start

1. **Run the setup script:**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Start the development server:**
   ```bash
   bun run dev
   ```

3. **Access the application:**
   - Application: http://localhost:5173
   - pgAdmin: http://localhost:5050

## Manual Setup

If you prefer manual setup:

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Start the database:**
   ```bash
   docker-compose up -d
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Start development server:**
   ```bash
   bun run dev
   ```

## Database Management

### Start the database
```bash
bun run db:up
# or
docker-compose up -d
```

### Stop the database
```bash
bun run db:down
# or
docker-compose down
```

### View database logs
```bash
bun run db:logs
# or
docker-compose logs -f postgres
```

### Access pgAdmin
- URL: http://localhost:5050
- Email: `admin@timetrack.local`
- Password: `admin`

To connect to the database in pgAdmin:
- Host: `postgres` (or `localhost` from your machine)
- Port: `5432`
- Database: `timetrack`
- Username: `timetrack`
- Password: `timetrack_dev_password`

## Database Schema

The database includes the following tables:

### Core Tables
- `users` - User accounts and authentication
- `clients` - Client information
- `projects` - Project management
- `time_entries` - Time tracking entries
- `tags` - Tags for time entries
- `invoices` - Invoice management
- `invoice_items` - Line items for invoices

### Team Features
- `team_members` - Project team membership
- `project_invitations` - Project invitation management

### Integrations
- `api_keys` - API key management
- `oauth_tokens` - OAuth integration tokens
- `calendar_sync` - Calendar synchronization settings
- `slack_integrations` - Slack integration configuration

### Advanced Features (Phase 3)
- `project_budgets` - Budget tracking per project
- `expenses` - Expense management
- `currency_rates` - Multi-currency support
- `recurring_invoices` - Automated invoice generation

## Migrations

All migrations are automatically applied when the database starts for the first time. Migration files are located in the `migrations/` directory:

1. `01_initial_schema.sql` - Core tables and indexes
2. `02_per_project_architecture.sql` - Team features
3. `03_api_keys.sql` - API key management
4. `04_integrations.sql` - OAuth and integrations
5. `05_phase3_advanced_features.sql` - Budgets, expenses, recurring invoices

## Environment Variables

Configure your `.env` file with:

```env
VITE_DB_HOST=localhost
VITE_DB_PORT=5432
VITE_DB_NAME=timetrack
VITE_DB_USER=timetrack
VITE_DB_PASSWORD=timetrack_dev_password
VITE_API_URL=http://localhost:3000
```

## Authentication

The application includes built-in authentication using bcrypt for password hashing. User accounts are stored in the `users` table.

## Data Persistence

Database data is persisted in Docker volumes:
- `postgres_data` - PostgreSQL data
- `pgadmin_data` - pgAdmin configuration

To completely reset the database:
```bash
docker-compose down -v
docker-compose up -d
```

## Production Deployment

For production deployment:

1. Update `.env` with production database credentials
2. Use a secure password for `VITE_DB_PASSWORD`
3. Ensure database is not publicly accessible
4. Set up SSL/TLS connections
5. Configure proper backup strategies
6. Use environment-specific docker-compose files

## Troubleshooting

### Database won't start
```bash
# Check Docker is running
docker info

# Check logs
docker-compose logs postgres

# Restart the database
docker-compose restart postgres
```

### Connection refused
```bash
# Ensure database is running
docker-compose ps

# Check if port 5432 is available
lsof -i :5432

# Verify environment variables
cat .env
```

### Migrations not applied
The migrations in the `migrations/` directory are automatically applied on first database startup. If you need to reapply:
```bash
# Stop and remove the database
docker-compose down -v

# Start fresh
docker-compose up -d
```

## Migration from Supabase

### What Changed
- ✅ Replaced `@supabase/supabase-js` with direct PostgreSQL connection
- ✅ Created custom client wrapper with Supabase-compatible API
- ✅ Added `users` table for authentication (was handled by Supabase Auth)
- ✅ Converted all `auth.uid()` references to use `users.id`
- ✅ All Row Level Security (RLS) logic preserved in application layer

### What Stayed the Same
- ✅ All database tables and schema
- ✅ All application features and functionality
- ✅ All React components and hooks
- ✅ All business logic

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Docker logs: `docker-compose logs`
3. Verify environment variables in `.env`
4. Ensure all dependencies are installed: `bun install`
