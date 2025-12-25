# 🚀 Quick Start Guide

**New to TimeGrid?** Read this first!

---

## ⚡ 60-Second Overview

TimeGrid is a time tracking app with:
- 🌐 **Web** (browser-based)
- 🖥️ **Desktop** (Windows, macOS, Linux)
- 📱 **Mobile** (iOS, Android)

All platforms share the same backend and frontend code using Tauri.

---

## 📖 Documentation Map

### Start Here
- **First time?** → [`docs/DEPLOYMENT_INDEX.md`](DEPLOYMENT_INDEX.md)
- **Need to deploy?** → Pick your platform below
- **Want to clean code?** → [`docs/PROJECT_CLEANUP.md`](PROJECT_CLEANUP.md)

### Deployment Guides (Choose ONE)

| Platform | Guide | Time | Next Step |
|----------|-------|------|-----------|
| **Web** | [DEPLOY.md](DEPLOY.md#frontend-deployment) | 5-10 min | Deploy dist/ folder |
| **Desktop** | [DESKTOP_DEPLOYMENT.md](DESKTOP_DEPLOYMENT.md) | 20-30 min | Run `npm run tauri:build` |
| **Mobile** | [MOBILE_DEPLOYMENT.md](MOBILE_DEPLOYMENT.md) | 30-45 min | Run `npm run tauri:ios:build` or `tauri:android:build` |
| **Docker** | [DEPLOY.md#docker](DEPLOY.md#docker-deployment-all-in-one) | 10 min | Run `docker-compose up` |

---

## 🏃 Get Running in 5 Minutes

```bash
# 1. Clone
git clone <repo-url>
cd time-brutalist

# 2. Install
cd frontend && npm install && cd ..

# 3. Start (choose one)

# Option A: Docker (easiest)
cd docker && docker-compose up --build

# Option B: Manually
# Terminal 1:
cd backend/server && npm install && npm start

# Terminal 2:
cd frontend && npm run dev

# Done! 
# Web: http://localhost:8080
# API: http://localhost:3000
```

---

## 🎯 Choose Your Path

### Path 1: Web Developer
```bash
cd frontend
npm run dev      # Start dev server
npm run build    # Create production build
```
→ Deploy `dist/` folder to: Vercel, Netlify, AWS, etc.

### Path 2: Desktop Developer
```bash
cd frontend
npm run tauri:dev      # Dev mode with hot reload
npm run tauri:build    # Create installers
```
→ Deploy `.dmg`, `.exe`, or `.deb` files

### Path 3: Mobile Developer
```bash
cd frontend

# iOS
npm run tauri:ios:dev     # Dev on simulator
npm run tauri:ios:build   # Build for App Store

# Android
npm run tauri:android:dev     # Dev on emulator
npm run tauri:android:build   # Build for Play Store
```

### Path 4: Backend Developer
```bash
cd backend/server
npm install
npm start        # API on http://localhost:3000
```

---

## 🛠️ Essential Commands

```bash
# Frontend
npm run dev              # Development server
npm run build            # Production build
npm run tauri:dev        # Desktop dev
npm run tauri:build      # Desktop build
npm run tauri:ios:dev    # iOS dev
npm run tauri:android:dev # Android dev

# Backend
npm start               # Start API server
npm run migrate         # Run database migrations
node seed-dummy-data.js # Add test data

# Docker
docker-compose up       # Start all services
docker-compose down     # Stop all services
```

---

## 🌍 Environment Variables

Create `.env` in `frontend/`:

```env
# Required
VITE_API_URL=http://localhost:3000

# For production, use your deployed API
# VITE_API_URL=https://api.yourdomain.com
```

---

## 📁 Project Structure

```
time-brutalist/
├── frontend/          # React + Vite web app
├── backend/server/    # Express API
├── desktop/src-tauri/ # Tauri desktop app
├── docker/            # Docker setup
├── docs/              # This documentation
└── scripts/           # Deployment scripts
```

---

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] Environment variables set correctly
- [ ] API URL verified
- [ ] Database migrations run
- [ ] Build succeeds locally (`npm run build`)
- [ ] Tests pass (if available)
- [ ] No errors in browser console

---

## 🆘 Common Issues

| Problem | Solution |
|---------|----------|
| "API not found" | Check `VITE_API_URL` and ensure backend is running |
| "Module not found" | Run `npm install` in the folder |
| "Build fails" | Check Node version (need v18+) |
| "Port already in use" | Change port in `vite.config.ts` |
| "CORS error" | Backend's `FRONTEND_URLS` must include your origin |

See the full troubleshooting section in deployment guides.

---

## 🎓 Learning Resources

1. **Understand the project** (5 min)
   - Read: [README.md](../README.md)

2. **Set up development** (15 min)
   - Run: Local dev server
   - Explore: `frontend/src/` folder structure

3. **Learn deployment** (30 min)
   - Read: [DEPLOYMENT_INDEX.md](DEPLOYMENT_INDEX.md)
   - Choose platform: Desktop or Mobile or Web

4. **Deploy somewhere** (1-2 hours)
   - Follow: Platform-specific guide
   - Test thoroughly

5. **Clean up code** (optional, 30 min)
   - Read: [PROJECT_CLEANUP.md](PROJECT_CLEANUP.md)
   - Execute: Cleanup tasks

---

## 🚀 Deploy to Production

### Web
```bash
cd frontend
export VITE_API_URL=https://api.yourdomain.com
npm run build
# Deploy ./dist/ to your hosting
```

### Desktop
```bash
cd frontend
export VITE_API_URL=https://api.yourdomain.com
npm run build
npm run tauri:build
# Distribute .dmg, .exe, or .deb
```

### Mobile
```bash
cd frontend
export VITE_API_URL=https://api.yourdomain.com
npm run build
npm run tauri:ios:build  # For iOS App Store
npm run tauri:android:build # For Google Play
```

See full guides for code signing, notarization, app store submission, etc.

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| [DEPLOYMENT_INDEX.md](DEPLOYMENT_INDEX.md) | Navigation hub (start here!) |
| [DESKTOP_DEPLOYMENT.md](DESKTOP_DEPLOYMENT.md) | Desktop app guide |
| [MOBILE_DEPLOYMENT.md](MOBILE_DEPLOYMENT.md) | Mobile app guide |
| [DEPLOY.md](DEPLOY.md) | Web & backend guide |
| [PROJECT_CLEANUP.md](PROJECT_CLEANUP.md) | Code cleanup guide |
| [DOCUMENTATION_SUMMARY.md](DOCUMENTATION_SUMMARY.md) | What's in each guide |

---

## 🎯 Next Steps

1. **Right now:** Run locally with Docker
   ```bash
   cd docker && docker-compose up --build
   ```

2. **This week:** Choose your deployment platform and read the guide

3. **This month:** Deploy to production

4. **This quarter:** Set up auto-updates and CI/CD

---

## 💡 Pro Tips

✨ Use `npm run tauri:dev` for fast desktop development (hot reload works!)

✨ Set `VITE_API_URL` to your machine's IP for mobile device testing

✨ The web version works offline - try disconnecting your network!

✨ All platforms use the same backend - changes apply everywhere

✨ Check browser DevTools (F12) for API errors

---

## 🆘 Getting Help

- **Can't find something?** Check [DEPLOYMENT_INDEX.md](DEPLOYMENT_INDEX.md)
- **Deployment question?** See relevant platform guide
- **Code cleanup?** See [PROJECT_CLEANUP.md](PROJECT_CLEANUP.md)
- **General question?** Check [README.md](../README.md)

---

## 🎉 You're Ready!

Start with `docs/DEPLOYMENT_INDEX.md` or pick your platform above and jump in!

Questions? Check the troubleshooting sections in the deployment guides.

Happy deploying! 🚀
