# TimeGrid - Advanced Time Tracking Application

A modern time tracking application with advanced reporting, team collaboration, and billing features.

## 🚀 Quick Start

```sh
# Install dependencies
bun install

# Set up environment (PostgreSQL + API server required)
cp .env.example .env
# Edit .env with your database credentials

# Start PostgreSQL (via Docker)
docker-compose up -d

# Start API server (in another terminal)
cd server && node index.js

# Start development server
bun run dev
```

## 🐳 Deploy with Docker

This repo includes a ready-to-run Docker stack for the API, database, and static frontend.

### Quick Start
- Copy `.env.example` to `.env` and set at least:
  - `JWT_SECRET` to a strong random string
  - `FRONTEND_URLS` to your frontend origins (comma-separated)
  - `VITE_API_URL` to your backend external URL
- Start everything:
  - `docker-compose up --build`
- Visit:
  - Frontend: `http://localhost:8080`
  - API health: `http://localhost:3000/health`

### What “migrations” mean
- Migrations are versioned SQL files that create/alter tables safely over time.
- On first run, Postgres executes SQL files from `server/migrations/` via `docker-entrypoint-initdb.d`.
- On subsequent runs, the backend also runs `server/run-migrations.js` which tracks applied files in a `schema_migrations` table and applies any new ones.

### Environment Variables
- Backend (API)
  - `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` — DB connection
  - `JWT_SECRET` — required in production
  - `FRONTEND_URLS` — comma-separated CORS allowlist (e.g. `https://app.example.com,tauri://localhost`)
  - `NODE_ENV` — set to `production` when deploying
- Frontend (build-time)
  - `VITE_API_URL` — API base URL baked into the frontend at build

### Cloudflare Tunnel / Reverse Proxy
- Point `api.yourdomain` to the backend (`:3000`) and `app.yourdomain` to the frontend (`:8080`).
- Keep TLS at the edge; the backend enforces HTTPS when `NODE_ENV=production`.
- Do not cache API endpoints at the CDN.

### Tauri Build
- The desktop app uses the same API URL you set in `VITE_API_URL`.
- Before building: `VITE_API_URL=https://api.yourdomain npm run tauri:build`.

## 🏗️ Architecture

- **Frontend**: React + Vite (port 8080/8081)
- **API**: Express.js with JWT authentication (port 3000)
- **Database**: PostgreSQL 15 (Docker)
- **Security**: Helmet, CORS, Rate Limiting, Input Validation

## ✨ Features (17 Complete)

### Core Time Tracking
- ⏱️ **Timer** - Start/stop/pause with real-time tracking
- 📝 **Time Entries** - Full CRUD operations with manual entry
- 📊 **Dashboard** - Charts, statistics, week/month views
- 📈 **Reports** - Advanced analytics with custom date ranges and export

### Project & Client Management
- � **Projects** - Manage projects with colors and hourly rates
- 👔 **Clients** - Complete client management system
- 🏷️ **Tags** - Categorize entries with custom tags
- 💰 **Budgets** - Track project budgets with alerts
- � **Expenses** - Billable/non-billable expense tracking

### Business Features
- 🧾 **Invoices** - Generate and export invoices to PDF
- 👥 **Team** - Invite members with role-based permissions
- 🔑 **API Keys** - Generate keys for integrations
- 📥 **Import** - Import from Toggl, Clockify, Harvest (CSV/JSON)
- � **Integrations** - Connect to 5+ external services

### System
- 🔐 **Authentication** - JWT-based auth with 7-day tokens
- ⚙️ **Settings** - Feature toggles, themes, data management
- ⌨️ **Keyboard Shortcuts** - Global shortcuts for quick navigation
- 🔒 **Security** - Rate limiting, input validation, CORS protection

## 📚 Documentation

- [Authentication Guide](docs/AUTHENTICATION.md) - JWT implementation and usage
- [Frontend Integration](FRONTEND_JWT_INTEGRATION.md) - Frontend JWT setup (completed)
- [JWT Implementation](JWT_IMPLEMENTATION.md) - Technical implementation details
- [Security Overview](server/SECURITY.md) - Security features and best practices
- [Logging Cleanup](LOGGING_CLEANUP.md) - Production logging guide

## 🛠️ Tech Stack

React 18 • TypeScript • Vite • Tailwind CSS • shadcn/ui • Recharts • Supabase


## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
