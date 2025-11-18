
# 🚀 TimeGrid Deployment Guide

Welcome to the complete deployment manual for TimeGrid! This guide covers every platform and scenario, from local development to production, for backend, frontend, desktop, and mobile.

---

## 📋 Table of Contents

1. [General Prerequisites](#general-prerequisites)
2. [Environment Variables](#environment-variables)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Desktop (Tauri) Deployment](#desktop-tauri-deployment)
6. [Mobile Deployment (iOS/Android)](#mobile-deployment-iosandroid)
7. [Cloud/Server Deployment](#cloudserver-deployment)
8. [Docker Deployment (All-in-One)](#docker-deployment-all-in-one)
9. [Reverse Proxy & Domains](#reverse-proxy--domains)
10. [Troubleshooting & FAQ](#troubleshooting--faq)
11. [One-command Deploy](#one-command-deploy)

---

## 1. General Prerequisites

- **Docker & Docker Compose** (recommended for most users)
- **Node.js** (LTS recommended)
- **Bun** (for frontend)
- **Rust** (for desktop/Tauri)
- **PostgreSQL** (if not using Docker)
- **Git**
- **npm** (for Tauri/desktop)

---

## 2. Environment Variables

**Backend (API):**
- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` — PostgreSQL connection
- `JWT_SECRET` — required in production (use a strong random value)
- `FRONTEND_URLS` — comma-separated list of allowed frontend origins (e.g. `https://app.example.com,tauri://localhost`)
- `NODE_ENV` — set to `production` when deploying

**Frontend (build-time):**
- `VITE_API_URL` — the API base URL baked into the frontend at build time

**Desktop (Tauri):**
- Uses the same `VITE_API_URL` as frontend

---

## 3. Backend Deployment

### Linux/macOS
```sh
cd backend/server
# Install dependencies (if package.json exists)
npm install
# Set up .env (copy from .env.example if needed)
cp .env.example .env
# Edit .env with your DB credentials and secrets
# Start the server
node index.js
```

### Windows
1. Open PowerShell or CMD.
2. Navigate to `backend/server`.
3. Install dependencies: `npm install`
4. Copy and edit `.env` as above.
5. Start the server: `node index.js`

### Database Migrations
- On first run, migrations in `backend/server/migrations/` are applied automatically if using Docker Compose.
- For manual DB upgrades, run: `node run-migrations.js`

---

## 4. Frontend Deployment

### Linux/macOS
```sh
cd frontend
bun install
# Set up .env (copy from .env.example if needed)
cp .env.example .env
# Edit .env with correct VITE_API_URL
bun run build
# Serve with any static server (e.g., serve, nginx, or Docker)
```

### Windows
1. Open PowerShell or CMD.
2. Navigate to `frontend`.
3. Install Bun if not present: https://bun.sh/docs/installation
4. Install dependencies: `bun install`
5. Copy and edit `.env` as above.
6. Build: `bun run build`
7. Serve with a static server (e.g., `npx serve dist`)

---

## 5. Desktop (Tauri) Deployment

### Prerequisites
- Rust (https://rustup.rs/)
- Node.js & npm
- Tauri CLI: `npm install -g @tauri-apps/cli`

### Build & Run (All Platforms)
```sh
cd desktop/src-tauri
# Set VITE_API_URL in frontend/.env or as build arg
npm install
npm run tauri dev   # For development
npm run tauri build # For production build
```

### Windows/macOS/Linux
- The build output will be in `desktop/src-tauri/target/release/bundle/` (or similar)
- Distribute the binary or installer as needed

---

## 6. Mobile Deployment (iOS/Android)

> **Note:** Mobile support is planned. This section is a placeholder for future React Native/Capacitor/Flutter integration.

### Planned Steps
- Clone the repo and navigate to `mobile/`
- Follow platform-specific setup (to be documented)
- Set API URL and credentials as for frontend/desktop
- Build and run with Xcode/Android Studio or CLI

---

## 7. Cloud/Server Deployment

### With Docker (Recommended)
1. Set all required environment variables in `.env` (see above)
2. Run:
   ```sh
   cd docker
   docker-compose up --build -d
   ```
3. Configure your reverse proxy (see below)

### Manual (Advanced)
- Build frontend: `cd frontend && bun run build`
- Deploy backend: `cd backend/server && node index.js`
- Serve frontend with Nginx, Caddy, or similar
- Use systemd or pm2 for backend process management

---

## 8. Docker Deployment (All-in-One)

### Quick Start
```sh
cp .env.example .env
# Edit .env as needed
cd docker
docker-compose up --build -d
```
- Frontend: http://localhost:8080
- API: http://localhost:3000/health

### What “migrations” mean
- Migrations are versioned `.sql` files in `backend/server/migrations/`
- Fresh DB: Postgres runs these automatically (via `docker-entrypoint-initdb.d`)
- Upgrades: backend runs `run-migrations.js` on startup, tracks applied files in `schema_migrations`, and applies any new ones

---

## 9. Reverse Proxy & Domains

### Example: Nginx
```nginx
server {
  listen 80;
  server_name app.yourdomain;
  location / {
    proxy_pass http://localhost:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
server {
  listen 80;
  server_name api.yourdomain;
  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

### Cloudflare Tunnel
- Map `api.yourdomain` → backend container port `3000`
- Map `app.yourdomain` → frontend container port `8080`
- Set envs:
  - `VITE_API_URL=https://api.yourdomain`
  - `FRONTEND_URLS=https://app.yourdomain,tauri://localhost`
  - `NODE_ENV=production` and a strong `JWT_SECRET`
- Rebuild frontend to bake the API URL:
  - `docker-compose up --build -d`
- Keep TLS at the edge; do not cache API routes at your CDN

---

## 10. Troubleshooting & FAQ

- **CORS blocked:**
  - Ensure your frontend URL is included in `FRONTEND_URLS` exactly (protocol + host + port)
- **Health check fails:**
  - `docker-compose logs -f backend` and `docker-compose logs -f postgres`
  - Verify DB vars and that migrations ran (look for `schema_migrations` table)
- **Wrong API URL in frontend:**
  - Rebuild with correct `VITE_API_URL`
- **Desktop app cannot connect:**
  - Ensure `VITE_API_URL` is set and backend CORS allows `tauri://localhost`
- **Database not persisting:**
  - Check Docker volume mounts in `docker-compose.yml`
- **Ports already in use:**
  - Change ports in `docker-compose.yml` or stop conflicting services
- **Windows-specific issues:**
  - Run terminals as Administrator if you see permission errors
  - Use WSL2 for best Docker compatibility
- **macOS-specific issues:**
  - Grant permissions to Docker and CLI tools in System Preferences
- **Linux-specific issues:**
  - Ensure your user is in the `docker` group

---

## 11. One-command Deploy

- Use `scripts/deploy.sh` for env validation and automatic bring-up
- Usage:
  ```sh
  bash scripts/deploy.sh
  ```
- This script checks your environment, builds, starts, and verifies the stack

---

## 🏁 Best Practices

- Always use strong secrets in production
- Use HTTPS/TLS for all public endpoints
- Regularly update dependencies and Docker images
- Monitor logs and health endpoints
- Back up your database regularly

---

## 📚 Further Reading

- [README.md](../README.md) — Project overview and navigation
- [backend/server/SECURITY.md](../backend/server/SECURITY.md) — Security features and best practices
- [Tauri Docs](https://tauri.app/v1/guides/) — For desktop builds
- [Docker Docs](https://docs.docker.com/)
- [Bun Docs](https://bun.sh/docs/)
