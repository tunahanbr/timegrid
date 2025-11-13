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

## 🏗️ Architecture

- **Frontend**: React + Vite (port 8080/8081)
- **API**: Express.js (port 3000)
- **Database**: PostgreSQL 15 (Docker)

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
- 🔐 **Authentication** - Secure login/signup with protected routes
- ⚙️ **Settings** - Feature toggles, themes, data management
- ⌨️ **Keyboard Shortcuts** - Global shortcuts for quick navigation

## 🛠️ Tech Stack

React 18 • TypeScript • Vite • Tailwind CSS • shadcn/ui • Recharts • Supabase


## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
