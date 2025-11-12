# 🚀 Quick Start - Updated with API Server

## What Changed?

The PostgreSQL `pg` library can't run in the browser, so we've added a **backend API server** that handles all database operations.

## Architecture

```
Browser (React) → API Server (Express) → PostgreSQL (Docker)
     :8080             :3000                 :5432
```

## Start Everything

You need to run **TWO** terminals:

### Terminal 1: Database + API Server + Frontend (All at once)
```bash
# Start database
npm run db:up

# Start both API server AND frontend
npm run dev:all
```

This will start:
- PostgreSQL on port 5432 ✅
- API Server on port 3000 ✅
- Vite dev server on port 8080 ✅

### OR Terminal 1 & 2: Start Separately

**Terminal 1 - API Server:**
```bash
npm run db:up        # Start PostgreSQL
npm run dev:server   # Start API server (port 3000)
```

**Terminal 2 - Frontend:**
```bash
npm run dev          # Start Vite (port 8080)
```

## Access Points

- **Frontend:** http://localhost:8080
- **API Server:** http://localhost:3000
- **API Health:** http://localhost:3000/health
- **pgAdmin:** http://localhost:5050
- **PostgreSQL:** localhost:5432

## How It Works

### 1. Browser Client (`src/integrations/db/client.ts`)
```typescript
// Makes HTTP requests to API server
const { data, error } = await supabase
  .from('projects')
  .select('*');

// Translates to: GET http://localhost:3000/api/projects
```

### 2. API Server (`server/index.js`)
- Receives HTTP requests from browser
- Connects to PostgreSQL
- Executes SQL queries
- Returns JSON responses

### 3. PostgreSQL Database (Docker)
- Stores all data
- 19 tables ready
- Accessible via API only

## API Endpoints

### Authentication
```
POST /api/auth/signup   - Create new user
POST /api/auth/signin   - Sign in
POST /api/auth/signout  - Sign out
GET  /api/auth/user     - Get current user
```

### Generic CRUD
```
GET    /api/:table       - Get all records (with filters)
POST   /api/:table       - Create record(s)
PATCH  /api/:table       - Update record(s)
DELETE /api/:table       - Delete record(s)
```

### Examples
```bash
# Get all projects
GET http://localhost:3000/api/projects

# Get projects for specific user
GET http://localhost:3000/api/projects?user_id=abc-123

# Create a project
POST http://localhost:3000/api/projects
Body: { "name": "My Project", "user_id": "abc-123" }

# Update a project
PATCH http://localhost:3000/api/projects
Body: { 
  "data": { "name": "Updated Name" },
  "filters": { "id": "project-id" }
}

# Delete a project
DELETE http://localhost:3000/api/projects
Body: { "id": "project-id" }
```

## Development Workflow

### Daily Start
```bash
# Terminal 1
npm run dev:all

# Or if you prefer separate terminals:
# Terminal 1: npm run dev:server
# Terminal 2: npm run dev
```

### Check Everything is Running
```bash
# Check API server
curl http://localhost:3000/health

# Check database
docker-compose ps

# Check frontend
# Visit http://localhost:8080
```

### Stop Everything
```bash
# Stop frontend (Ctrl+C in terminal)
# Stop API server (Ctrl+C in terminal)
# Stop database
npm run db:down
```

## Troubleshooting

### "Cannot connect to API"
```bash
# Make sure API server is running
npm run dev:server

# Check it's listening
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"..."}
```

### "Database connection failed"
```bash
# Check PostgreSQL is running
docker-compose ps

# Check logs
npm run db:logs

# Restart database
docker-compose restart postgres
```

### Port Already in Use

**Port 3000 (API Server):**
```bash
# Find what's using it
lsof -i :3000

# Kill it
kill -9 <PID>
```

**Port 5432 (PostgreSQL):**
```bash
# Find what's using it
lsof -i :5432

# Kill it
kill -9 <PID>
```

## Environment Variables

Your `.env` file should have:
```env
# Database (used by API server)
VITE_DB_HOST=localhost
VITE_DB_PORT=5432
VITE_DB_NAME=timetrack
VITE_DB_USER=timetrack
VITE_DB_PASSWORD=timetrack_dev_password

# API URL (used by browser client)
VITE_API_URL=http://localhost:3000
```

## Project Structure

```
time-brutalist/
├── server/
│   └── index.js                    # API server (Express)
├── src/
│   ├── integrations/
│   │   └── db/
│   │       └── client.ts           # Browser client (fetch API)
│   ├── contexts/
│   │   └── AuthContext.tsx         # Updated auth
│   └── ...
├── migrations/                      # PostgreSQL migrations
│   ├── 01_initial_schema.sql
│   ├── 02_per_project_architecture.sql
│   ├── 03_api_keys.sql
│   ├── 04_integrations.sql
│   └── 05_phase3_advanced_features.sql
└── docker-compose.yml              # PostgreSQL + pgAdmin
```

## npm Scripts

```bash
# Development
npm run dev              # Start frontend only (Vite)
npm run dev:server       # Start API server only
npm run dev:all          # Start both (concurrently)

# Database
npm run db:up            # Start PostgreSQL
npm run db:down          # Stop PostgreSQL
npm run db:logs          # View PostgreSQL logs

# Build
npm run build            # Build for production
npm run preview          # Preview production build
```

## Testing the Setup

1. **Start everything:**
   ```bash
   npm run dev:all
   ```

2. **Check API health:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Open browser:**
   - Visit http://localhost:8080
   - Sign up with a new account
   - Create a project

4. **Check database:**
   ```bash
   # Connect to PostgreSQL
   docker-compose exec postgres psql -U timetrack -d timetrack
   
   # View users
   SELECT * FROM users;
   
   # View projects
   SELECT * FROM projects;
   
   # Exit
   \q
   ```

## Production Deployment

For production, you'll need to:

1. **Deploy API Server** (Node.js app)
   - Heroku, AWS, DigitalOcean, etc.
   - Set environment variables
   - Run `node server/index.js`

2. **Deploy PostgreSQL**
   - Managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
   - Or self-hosted with docker-compose

3. **Deploy Frontend**
   - Build: `npm run build`
   - Deploy `dist/` folder to Netlify, Vercel, etc.
   - Set `VITE_API_URL` to your API server URL

4. **Update CORS**
   - In `server/index.js`, update CORS to allow your frontend domain

## Security Notes

- ⚠️ Current setup is for **development only**
- For production:
  - Add JWT/session authentication
  - Implement rate limiting
  - Add input validation
  - Use HTTPS
  - Secure CORS settings
  - Use strong database passwords
  - Add SQL injection prevention (parameterized queries ✅ already done)

---

**You're all set!** 🎉

Start with: `npm run dev:all`

Then visit: http://localhost:8080
