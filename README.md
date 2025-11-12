# Time Brutalist - Advanced Time Tracking Application

A modern, brutalist-styled time tracking application with advanced reporting, team collaboration, and billing features.

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

## Project info

**URL**: https://lovable.dev/projects/76531feb-ff2a-4981-b6a4-ae56799f0eed

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/76531feb-ff2a-4981-b6a4-ae56799f0eed) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/76531feb-ff2a-4981-b6a4-ae56799f0eed) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
