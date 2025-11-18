# TimeGrid - Advanced Time Tracking Application

TimeGrid is a modern time tracking application with advanced reporting, team collaboration, and billing features.

---

## �️ Project Structure

- `frontend/` — React + Vite app (web client)
- `backend/` — Node.js/Express API server and migrations
- `desktop/` — Tauri (desktop app)
- `mobile/` — (Reserved for iOS/Android)
- `docker/` — Dockerfiles, Compose, and configs
- `scripts/` — Setup and deployment scripts
- `docs/` — Documentation (platform, deployment, etc.)
- `.archive/` — Obsolete or backup files

---

## 🚀 Onboarding & Setup

### 1. Prerequisites
- Node.js (LTS recommended)
- Bun (for frontend)
- Docker & Docker Compose
- Rust (for desktop/Tauri)
- PostgreSQL (if not using Docker)

### 2. Clone & Install
```sh
git clone <repo-url>
cd timegrid
# Install frontend dependencies
cd frontend && bun install
# Install backend dependencies (if any)
# (e.g., npm install in backend/server if needed)
```

### 3. Environment Setup
- Copy `.env.example` to `.env` in the root or as needed in `frontend/` and `backend/`.
- Edit `.env` files with your credentials and URLs.

### 4. Local Development
#### Start with Docker (recommended)
```sh
cd docker
docker-compose up --build
```
- Frontend: http://localhost:8080
- API: http://localhost:3000/health

#### Manual (advanced)
Start PostgreSQL (locally or via Docker)
```sh
# Backend
cd backend/server
node index.js
# Frontend (in another terminal)
cd frontend
bun run dev
```

#### Desktop (Tauri)
```sh
cd desktop/src-tauri
# Set VITE_API_URL in frontend/.env or as build arg
npm run tauri dev
```

#### Mobile
- (Reserved for future iOS/Android setup)

---

## 🐳 Deployment

### Deploy with Docker
1. Set all required environment variables in `.env`.
2. Run:
   ```sh
   cd docker
   docker-compose up --build -d
   ```
3. Configure your reverse proxy (e.g., Nginx, Cloudflare Tunnel) to point to the correct ports.

### Manual Deployment
- Build frontend: `cd frontend && bun run build`
- Deploy backend: `cd backend/server && node index.js`
- (See docs/deployment/ for advanced scenarios)

### Desktop (Tauri)
- Build: `cd desktop/src-tauri && npm run tauri build`
- Distribute binaries as needed for Windows/macOS/Linux

### Mobile
- (Reserved for future iOS/Android deployment)

---

## 🧭 Navigation & Docs

- See `docs/` for platform and deployment guides
- See `docker/` for all container configs
- See `scripts/` for setup and deployment helpers
- See `.archive/` for old/test files

---

## 🏗️ Architecture & Features

- **Frontend**: React + Vite (port 8080/8081)
- **API**: Express.js with JWT authentication (port 3000)
- **Database**: PostgreSQL 15 (Docker)
- **Security**: Helmet, CORS, Rate Limiting, Input Validation

See `docs/` for more details and advanced features.

---

## 🛠️ Tech Stack

React 18 • TypeScript • Vite • Tailwind CSS • shadcn/ui • Recharts • Supabase • Node.js • Express • Tauri • Docker

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Submit a pull request

---

## 📄 License

MIT
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
