# 🖥️ Desktop Deployment Guide (Tauri)

This guide covers building and deploying TimeGrid as a desktop application using Tauri v2, supporting macOS, Windows, and Linux.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Development Workflow](#development-workflow)
4. [Building for Production](#building-for-production)
5. [Code Signing & Notarization](#code-signing--notarization)
6. [Distribution & Installation](#distribution--installation)
7. [Auto-Updates](#auto-updates)
8. [Configuration](#configuration)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### All Platforms
- **Node.js** (LTS recommended, v18+)
- **npm** (comes with Node.js)
- **Git**
- **API Server** running (for backend communication)

### macOS
- **Xcode** (Xcode Command Line Tools at minimum)
  ```bash
  xcode-select --install
  ```
- **Rust** (v1.77.2 or later)
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  source "$HOME/.cargo/env"
  ```

### Windows
- **Visual Studio 2019+** with "Desktop development with C++" workload
- **Rust** (via `rustup-init.exe` from https://rustup.rs)
- **WebView2 Runtime** (usually pre-installed, else download from Microsoft)

### Linux
- **Rust** v1.77.2+
- **GCC/Clang** C compiler
- **pkg-config**
- **libwebkit2gtk** development libraries
  ```bash
  # Ubuntu/Debian
  sudo apt-get install libwebkit2gtk-4.1-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

  # Fedora
  sudo dnf install webkit2-gtk4.1-devel gcc g++ make libssl-dev openssl-devel
  ```

---

## Development Setup

### 1. Install Dependencies

```bash
cd /path/to/time-brutalist

# Frontend dependencies
cd frontend
npm install
# or with bun
bun install

# Install Tauri CLI (if not in package.json)
npm install -D @tauri-apps/cli @tauri-apps/api

cd ..
```

### 2. Environment Configuration

Create `.env` in the project root or in `frontend/` with:

```env
# API Configuration
VITE_API_URL=http://localhost:3000

# For production desktop builds, use your deployed API:
# VITE_API_URL=https://api.yourdomain.com
```

### 3. Configure API CORS

Ensure your backend's `FRONTEND_URLS` environment variable includes:

```env
FRONTEND_URLS=http://localhost:8081,tauri://localhost
```

This allows the Tauri app to communicate with your API.

---

## Development Workflow

### 1. Start Backend API

```bash
cd backend/server
npm install
npm start
# API should be running on http://localhost:3000
```

### 2. Run Desktop App in Dev Mode

```bash
cd frontend
npm run tauri:dev
```

This command:
- Starts the Vite dev server on `http://localhost:8081`
- Builds and launches the Tauri app
- Watches for file changes and hot-reloads

### 3. Using DevTools

In dev mode, you can access browser DevTools:
- Press **Ctrl+Shift+I** (Windows/Linux) or **Cmd+Option+I** (macOS)

### 4. Testing on Device Network

If testing from another machine:

```bash
# Get your machine's local IP
ipconfig getifaddr en0  # macOS
hostname -I            # Linux
ipconfig               # Windows

# Set API URL to your machine
export VITE_API_URL=http://192.168.1.100:3000
npm run tauri:dev
```

---

## Building for Production

### 1. Prepare for Build

```bash
cd frontend

# Set production API URL
export VITE_API_URL=https://api.yourdomain.com

# Build the frontend
npm run build

# Should create ./dist folder with compiled app
```

### 2. Build Desktop App

#### macOS & Linux
```bash
npm run tauri:build
```

#### Windows
```bash
npm run tauri:build
```

**Output locations:**
- **macOS**: `src-tauri/target/release/bundle/macos/TimeGrid.app`
- **Windows**: `src-tauri/target/release/bundle/msi/TimeGrid_1.0.0_x64_en-US.msi`
- **Linux**: `src-tauri/target/release/bundle/deb/timegrid_1.0.0_amd64.deb`

### 3. Build Configuration

Edit `frontend/src-tauri/tauri.conf.json`:

```json
{
  "productName": "TimeGrid",
  "version": "1.0.0",
  "identifier": "com.timegrid.app",
  "build": {
    "frontendDist": "../dist",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns", "icons/icon.ico"],
    "publisher": "YourCompany",
    "copyright": "Copyright © 2025"
  }
}
```

---

## Code Signing & Notarization

### macOS Code Signing & Notarization

For production macOS builds, you **must** sign and notarize your app.

#### 1. Create Signing Certificate

1. Open Keychain Access
2. Request a certificate from Certificate Authority
3. Export as `.p12` file
4. Set environment variables:

```bash
export APPLE_CERTIFICATE=$(cat /path/to/certificate.p12 | base64)
export APPLE_CERTIFICATE_PASSWORD=your_password
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name"
```

#### 2. Configure in tauri.conf.json

```json
{
  "bundle": {
    "macOS": {
      "certificateCommonName": "Developer ID Application: Your Name"
    }
  }
}
```

#### 3. Build with Signing

```bash
export APPLE_CERTIFICATE=$(cat /path/to/certificate.p12 | base64)
export APPLE_CERTIFICATE_PASSWORD=your_password
npm run tauri:build
```

#### 4. Notarize (Apple Requirement for Distribution)

```bash
# After build completes
xcrun notarytool submit ./src-tauri/target/release/bundle/macos/TimeGrid.dmg \
  --apple-id your-apple-id@example.com \
  --team-id YOUR_TEAM_ID \
  --password app-specific-password
```

### Windows Code Signing

For Windows, use a code signing certificate (`.pfx`):

```bash
export TAURI_WINDOWS_CERTIFICATE_PATH=/path/to/certificate.pfx
export TAURI_WINDOWS_CERTIFICATE_PASSWORD=your_password
npm run tauri:build
```

---

## Distribution & Installation

### macOS
1. **DMG (Disk Image)**
   ```bash
   # Already created in ./src-tauri/target/release/bundle/macos/
   # Users: Double-click DMG, drag app to Applications
   ```

2. **App Store (Optional)**
   - Use Xcode to submit to Mac App Store

### Windows
1. **MSI Installer**
   ```bash
   # Located at: ./src-tauri/target/release/bundle/msi/
   # Users: Run .msi file to install
   ```

2. **NSIS Installer** (alternative)
   - Configure in `tauri.conf.json` to use NSIS instead of MSI

### Linux
1. **DEB (Debian/Ubuntu)**
   ```bash
   # Located at: ./src-tauri/target/release/bundle/deb/
   sudo dpkg -i timegrid_1.0.0_amd64.deb
   ```

2. **AppImage** (cross-distribution)
   ```bash
   # Configure in tauri.conf.json
   ```

---

## Auto-Updates

### 1. Setup Update Server

Use GitHub Releases or a custom server:

```json
{
  "updater": {
    "active": true,
    "endpoints": ["https://updates.yourdomain.com/{{target}}/{{arch}}/update.json"],
    "dialog": true,
    "pubkey": "your_public_key_here"
  }
}
```

### 2. Generate Keys

```bash
npm run tauri signer generate -- --write-keys
```

This creates:
- `.tauri/key.private` (sign releases)
- `.tauri/key.pub` (verify updates)

### 3. Sign Release Artifacts

```bash
npm run tauri signer sign -- <path_to_app> --secret-key ~/.tauri/key.private
```

### 4. Hosting Updates

Create `update.json` on your server:

```json
{
  "version": "1.0.1",
  "notes": "Bug fixes and performance improvements",
  "pub_date": "2024-12-24T12:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "...",
      "url": "https://yourdomain.com/releases/TimeGrid.app.tar.gz"
    },
    "linux-x86_64": {
      "signature": "...",
      "url": "https://yourdomain.com/releases/timegrid_1.0.1_amd64.deb"
    },
    "windows-x86_64": {
      "signature": "...",
      "url": "https://yourdomain.com/releases/TimeGrid_1.0.1_x64_en-US.msi"
    }
  }
}
```

---

## Configuration

### Window Settings

Edit `frontend/src-tauri/tauri.conf.json`:

```json
{
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "TimeGrid",
        "width": 1400,
        "height": 900,
        "minWidth": 1024,
        "minHeight": 768,
        "resizable": true,
        "theme": "Dark"
      }
    ]
  }
}
```

### Tray Icon

```json
{
  "app": {
    "trayIcon": {
      "iconPath": "icons/icon.png",
      "tooltip": "TimeGrid",
      "iconAsTemplate": true
    }
  }
}
```

### Security

```json
{
  "app": {
    "security": {
      "csp": "default-src 'self'"
    }
  }
}
```

---

## Troubleshooting

### Common Issues

#### "Command not found: tauri"
```bash
# Install Tauri CLI
npm install -D @tauri-apps/cli
# Or use npx
npx tauri dev
```

#### "Failed to locate a valid installer"
- Ensure you've run `npm run build` before `npm run tauri:build`

#### CORS errors between app and API
- Check `FRONTEND_URLS` in backend includes `tauri://localhost`
- Ensure `VITE_API_URL` in frontend matches your API URL

#### White screen on app startup
- Check browser DevTools (Cmd+Option+I)
- Verify API is reachable
- Check `src-tauri/target/release/` for logs

#### macOS: "App is damaged and can't be opened"
- This means the app wasn't signed properly
- Run: `sudo xattr -rd com.apple.quarantine /Applications/TimeGrid.app`

#### Windows: "Certificate verification failed"
- Use a proper code-signing certificate
- Install Windows SDK if Rust build fails

### Debug Logging

Enable logging in development:

```rust
// src-tauri/src/main.rs
tauri::Builder::default()
  .plugin(tauri_plugin_log::Builder::default().build())
  .run(tauri::generate_context!())
```

Then check logs:
```bash
# macOS
~/Library/Logs/com.timegrid.app/

# Linux
~/.config/com.timegrid.app/logs/

# Windows
%APPDATA%\com.timegrid.app\logs\
```

### Getting Help

- [Tauri Documentation](https://tauri.app/)
- [Tauri API](https://docs.rs/tauri/)
- Check `/src-tauri/target/release/` build output for detailed errors

---

## Performance Tips

1. **Code Splitting**: Frontend already optimizes with Vite
2. **Minimize Bundle**: Use `npm run build` with proper env vars
3. **Update Check Interval**: Don't check too frequently to preserve bandwidth
4. **Lazy Load**: Import heavy modules dynamically
5. **Caching**: Implement app-level caching for API responses

---

## Security Checklist

- [ ] API uses HTTPS in production
- [ ] JWT secret is strong and unique
- [ ] CORS `FRONTEND_URLS` is restricted
- [ ] App is code-signed (macOS/Windows)
- [ ] Update signing keys are secure
- [ ] No credentials in environment variables
- [ ] Enable CSP (Content Security Policy)
- [ ] Regular security audits of dependencies

---

## Next Steps

- [Mobile Deployment Guide](./MOBILE_DEPLOYMENT.md)
- [Backend Deployment](./DEPLOY.md#backend-deployment)
- [Frontend Deployment](./DEPLOY.md#frontend-deployment)
