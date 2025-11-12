# 🚀 Quick Start Guide - PostgreSQL Time Tracker

## Start Everything (First Time)

```bash
# 1. Start database
docker-compose up -d

# 2. Verify database is running
docker-compose ps

# 3. Check tables were created
docker-compose exec postgres psql -U timetrack -d timetrack -c "\dt"

# 4. Start development server
npm run dev
```

## Daily Commands

```bash
# Start database
npm run db:up

# Start dev server
npm run dev

# Stop database (when done)
npm run db:down
```

## Database Access

### Via Command Line
```bash
docker-compose exec postgres psql -U timetrack -d timetrack
```

Common PostgreSQL commands:
- `\dt` - List all tables
- `\d table_name` - Describe a table
- `SELECT * FROM users LIMIT 10;` - Query data
- `\q` - Exit

### Via pgAdmin (Web UI)
1. Open http://localhost:5050
2. Login:
   - Email: `admin@timetrack.local`
   - Password: `admin`
3. Add server:
   - Name: `TimeTrack Local`
   - Host: `postgres`
   - Port: `5432`
   - Database: `timetrack`
   - Username: `timetrack`
   - Password: `timetrack_dev_password`

## Troubleshooting

### Database won't start
```bash
# Check Docker
docker info

# View logs
npm run db:logs

# Restart
docker-compose restart postgres
```

### Port already in use
```bash
# Check what's using port 5432
lsof -i :5432

# Kill process
kill -9 <PID>
```

### Reset database (deletes all data)
```bash
docker-compose down -v
docker-compose up -d
```

### Check environment
```bash
cat .env
```

## Database Info

- **Host:** localhost
- **Port:** 5432
- **Database:** timetrack
- **Username:** timetrack
- **Password:** timetrack_dev_password

## Application URLs

- **App:** http://localhost:5173
- **pgAdmin:** http://localhost:5050

## File Structure

```
time-brutalist/
├── docker-compose.yml          # Docker configuration
├── migrations/                 # Database migrations
│   ├── 01_initial_schema.sql
│   ├── 02_per_project_architecture.sql
│   ├── 03_api_keys.sql
│   ├── 04_integrations.sql
│   └── 05_phase3_advanced_features.sql
├── src/
│   └── integrations/
│       └── db/
│           └── client.ts       # PostgreSQL client
└── .env                        # Configuration
```

## What Changed from Supabase

✅ **Same functionality, different database**
- All features work exactly the same
- No code changes needed in components
- Database is now self-hosted

❌ **What's removed**
- Supabase dependency
- Remote database connection
- Supabase Auth (using custom auth now)

## Testing Checklist

After starting, test these features:
- [ ] Create user account
- [ ] Create project
- [ ] Create client
- [ ] Add time entry
- [ ] Create invoice
- [ ] Set project budget
- [ ] Add expense
- [ ] Create tag

## Need Help?

Check these files:
- `MIGRATION_COMPLETE.md` - Migration summary
- `POSTGRES_MIGRATION.md` - Full documentation
- `README.md` - Original project docs

## Common Issues

**"Cannot connect to database"**
→ Check `.env` file has correct credentials
→ Verify database is running: `docker-compose ps`

**"Tables not found"**
→ Check migrations were applied: `docker-compose exec postgres psql -U timetrack -d timetrack -c "\dt"`

**"Permission denied"**
→ Check user exists: `docker-compose exec postgres psql -U timetrack -d timetrack -c "SELECT * FROM users;"`

---

**Everything working?** 🎉 You're ready to develop!
