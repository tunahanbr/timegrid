# Deploy Guide

This project ships with Docker configs to run the API, database, and static frontend with minimal setup.

## Prerequisites
- Docker and docker-compose
- A `.env` file (copy from `.env.example`)
- Optional: domains or Cloudflare Tunnel for external URLs

## Environment Variables
- Backend (API)
  - `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` — PostgreSQL connection
  - `JWT_SECRET` — required in production (use a strong random value)
  - `FRONTEND_URLS` — comma-separated list of allowed frontend origins (e.g. `https://app.example.com,tauri://localhost`)
  - `NODE_ENV` — set to `production` when deploying
- Frontend (build-time)
  - `VITE_API_URL` — the API base URL baked into the frontend at build time

## What “migrations” mean
- Migrations are versioned `.sql` files that create/alter tables over time.
- Fresh DB: Postgres runs files from `server/migrations/` automatically (via `docker-entrypoint-initdb.d`).
- Upgrades: the backend runs `server/run-migrations.js` on startup, tracks applied files in `schema_migrations`, and applies any new ones.

## Quick Start (Local)
1. Copy env template:
   - `cp .env.example .env`
2. Edit `.env`:
   - Set `JWT_SECRET` to a strong value
   - Set `FRONTEND_URLS` (e.g., `http://localhost:8080,tauri://localhost`)
   - Confirm `VITE_API_URL=http://localhost:3000`
3. Build and start:
   - `docker-compose up --build -d`
4. Verify:
   - Frontend: `http://localhost:8080`
   - API health: `http://localhost:3000/health` (should return 200)

## External Deployment (Cloudflare Tunnel or Reverse Proxy)
- Map domains:
  - `api.yourdomain` → backend container port `3000`
  - `app.yourdomain` → frontend container port `8080`
- Set envs:
  - `VITE_API_URL=https://api.yourdomain`
  - `FRONTEND_URLS=https://app.yourdomain,tauri://localhost`
  - `NODE_ENV=production` and a strong `JWT_SECRET`
- Rebuild frontend to bake the API URL:
  - `docker-compose up --build -d`
- Keep TLS at the edge; do not cache API routes at your CDN.

## Tauri Desktop Build
- The desktop app uses `VITE_API_URL` as its API base.
- Before building, set `VITE_API_URL` to your external API:
  - `VITE_API_URL=https://api.yourdomain npm run tauri:build`
- Backend CORS already allows `tauri://localhost`.

## Troubleshooting
- CORS blocked:
  - Ensure your frontend URL is included in `FRONTEND_URLS` exactly (protocol + host + port).
- Health check fails:
  - `docker-compose logs -f backend` and `docker-compose logs -f postgres`
  - Verify DB vars and that migrations ran (look for `schema_migrations` table).
- Wrong API URL in frontend:
  - Rebuild with correct `VITE_API_URL`.

## One-command Deploy (Optional)
- Use `scripts/deploy.sh` for env validation and automatic bring-up.
- Usage: `bash scripts/deploy.sh`