# 📱 Mobile Deployment Guide (iOS & Android)

This guide covers building and deploying TimeGrid as a mobile application on iOS and Android using Tauri v2.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Development Workflow](#development-workflow)
4. [Building for Production](#building-for-production)
5. [iOS Deployment](#ios-deployment)
6. [Android Deployment](#android-deployment)
7. [Testing on Devices](#testing-on-devices)
8. [App Store & Play Store Distribution](#app-store--play-store-distribution)
9. [API Configuration](#api-configuration)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### All Platforms
- **Node.js** (LTS recommended, v18+)
- **npm** (comes with Node.js)
- **Rust** (v1.77.2+)
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  source "$HOME/.cargo/env"
  ```
- **Tauri CLI**
  ```bash
  npm install -D @tauri-apps/cli@2.x
  ```

### iOS (macOS only)
- **macOS 12.0+**
- **Xcode 14.0+** (includes iOS SDK)
  ```bash
  xcode-select --install
  ```
- **Xcode Command Line Tools**
  ```bash
  sudo xcode-select --reset
  ```
- **Apple Developer Account** (free for testing, paid for App Store)
- **Rust iOS targets**
  ```bash
  rustup target add aarch64-apple-ios x86_64-apple-ios
  ```

### Android (macOS, Linux, Windows)
- **Android Studio** (for SDK, emulator, and development tools)
  https://developer.android.com/studio

- **Android SDK** (API 24+)
  - Install via Android Studio SDK Manager
  - Or set `ANDROID_SDK_ROOT` environment variable
  ```bash
  export ANDROID_SDK_ROOT=~/Library/Android/sdk  # macOS
  # export ANDROID_SDK_ROOT=~/Android/Sdk         # Linux
  # export ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\sdk  # Windows
  ```

- **Android NDK** (for native code compilation)
  ```bash
  # Install via Android Studio SDK Manager, or:
  export NDK_HOME=$ANDROID_SDK_ROOT/ndk/26.0.10792818
  ```

- **Java Development Kit (JDK)** 11+
  ```bash
  java -version  # Should output version 11+
  ```

- **Rust Android targets**
  ```bash
  rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android
  ```

---

## Development Setup

### 1. Initialize Mobile Targets

#### iOS
```bash
cd frontend
npm run tauri:ios:init
```

This creates:
- `src-tauri/gen/ios/` — iOS project files
- Xcode project configuration

#### Android
```bash
cd frontend
npm run tauri:android:init
```

This creates:
- `src-tauri/gen/android/` — Android project files
- Gradle build configuration

### 2. Environment Configuration

Create `.env` in `frontend/`:

```env
# API Configuration
# For local development on device: use your machine's LAN IP
VITE_API_URL=http://192.168.1.100:3000

# For production
# VITE_API_URL=https://api.yourdomain.com
```

**Important:** Mobile apps **cannot** access `localhost` or `127.0.0.1` on your development machine. Use:
- Your machine's local network IP (e.g., `192.168.x.x`)
- A public API URL (for production testing)
- A tunnel service like Cloudflare Tunnel or ngrok

### 3. Backend CORS Configuration

Update your backend's `FRONTEND_URLS` to include mobile origins:

```env
FRONTEND_URLS=http://localhost:8081,tauri://localhost,capacitor://localhost,http://192.168.1.100:8080
```

---

## Development Workflow

### 1. Start Backend API

```bash
cd backend/server
npm install
npm start
# API should run on http://localhost:3000
```

### 2. Run iOS App in Dev Mode

#### On iOS Simulator
```bash
cd frontend
npm run tauri:ios:dev
```

This:
- Starts the Vite dev server
- Opens iOS Simulator
- Builds and runs the app
- Watches for changes and hot-reloads

#### On Physical iPhone
```bash
# First time only
npm run tauri:ios:init

# Then develop
npm run tauri:ios:dev
```

You'll be prompted to:
1. Select your development team
2. Confirm app bundle ID

### 3. Run Android App in Dev Mode

#### On Android Emulator
```bash
# First, start an emulator from Android Studio
# Or via command line:
emulator -avd Pixel_6_API_30 &

cd frontend
npm run tauri:android:dev
```

#### On Physical Android Device
```bash
# Connect device via USB with debugging enabled:
# Settings > Developer Options > USB Debugging

cd frontend
npm run tauri:android:dev
```

The app will:
- Build the APK
- Install on the device
- Launch automatically
- Enable hot reload

### 4. Network Access from Device

#### Forward API Port (Android)
```bash
adb forward tcp:3000 tcp:3000
adb forward tcp:8080 tcp:8080
```

Then set:
```env
VITE_API_URL=http://localhost:3000
```

#### Or use LAN IP (Recommended)
```bash
# Get your machine's IP
ipconfig getifaddr en0    # macOS
hostname -I               # Linux
ipconfig                  # Windows

# Set in .env
VITE_API_URL=http://192.168.1.100:3000

# Test with curl on device
adb shell curl http://192.168.1.100:3000/health
```

### 5. Debugging

#### iOS
- Open Safari → Develop → [Device] → TimeGrid
- Use browser DevTools

#### Android
- Use Android Studio's debugger
- Or Chrome DevTools: `chrome://inspect`

---

## Building for Production

### Frontend Build

```bash
cd frontend

# Set production API URL
export VITE_API_URL=https://api.yourdomain.com

# Build frontend
npm run build

# Verify dist/ folder is created
ls -la dist/
```

---

## iOS Deployment

### 1. Development Testing

```bash
npm run tauri:ios:dev
```

### 2. Production Build

```bash
npm run tauri:ios:build
```

Creates:
- `src-tauri/gen/ios/TimeGrid.xcodeproj` — Xcode project
- `.ipa` file — iOS app package

### 3. Code Signing

#### Automatic (Recommended)
Xcode handles code signing automatically. Ensure your Apple Developer account is added:

1. Open Xcode
2. Xcode → Settings → Accounts
3. Add your Apple ID
4. Select team for signing

#### Manual Signing
Edit `tauri.conf.json`:

```json
{
  "bundle": {
    "iOS": {
      "developmentTeam": "YOUR_TEAM_ID",
      "signingIdentity": "iPhone Developer"
    }
  }
}
```

### 4. Build Variants

#### Debug Build
```bash
npm run tauri:ios:build -- --debug
```

#### Release Build (for App Store)
```bash
npm run tauri:ios:build -- --release
```

---

## Android Deployment

### 1. Development Testing

```bash
npm run tauri:android:dev
```

### 2. Generate Keystore (First Time Only)

A keystore signs your APK. Generate once and keep it safe:

```bash
# via Android Studio
# OR command line:
keytool -genkey -v -keystore ~/timegrid-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias timegrid-key
```

**Security:** Store the keystore and password securely (not in git).

### 3. Configure Signing

Edit `frontend/src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "android": {
      "keystore": {
        "path": "/path/to/timegrid-release.keystore",
        "password": "your_keystore_password"
      }
    }
  }
}
```

Or set environment variables:

```bash
export TAURI_ANDROID_KEYSTORE_PATH=~/timegrid-release.keystore
export TAURI_ANDROID_KEYSTORE_PASSWORD=your_keystore_password
export TAURI_ANDROID_KEY_PASSWORD=your_key_password
export TAURI_ANDROID_KEY_ALIAS=timegrid-key
```

### 4. Production Build

```bash
export TAURI_ANDROID_KEYSTORE_PATH=~/timegrid-release.keystore
export TAURI_ANDROID_KEYSTORE_PASSWORD=your_password
export TAURI_ANDROID_KEY_PASSWORD=your_password
export TAURI_ANDROID_KEY_ALIAS=timegrid-key

npm run tauri:android:build -- --release
```

Output:
- `src-tauri/gen/android/app/build/outputs/apk/release/app-release.apk`
- `src-tauri/gen/android/app/build/outputs/bundle/release/app-release.aab` (for Play Store)

### 5. Build Variants

#### Debug APK (for testing)
```bash
npm run tauri:android:build -- --debug
```

#### Release APK (direct distribution)
```bash
npm run tauri:android:build -- --release
```

#### AAB (Android App Bundle for Play Store)
```bash
npm run tauri:android:build -- --release -- -o aab
```

---

## Testing on Devices

### iOS Simulator
- **Advantages**: Fast, no physical device needed
- **Disadvantages**: Can't test real device features
- **Usage**: `npm run tauri:ios:dev` (auto-opens simulator)

### iOS Physical Device
- Connect iPhone via USB
- Unlock and trust the device
- Select device in Xcode
- Run `npm run tauri:ios:dev`

### Android Emulator
- Launch from Android Studio
- Or: `emulator -avd Pixel_6_API_30 &`
- Run `npm run tauri:android:dev`

### Android Physical Device
- Enable **Settings > Developer Options > USB Debugging**
- Connect via USB
- Accept device authorization prompt
- Run `npm run tauri:android:dev`

### Testing API Connectivity

```bash
# On device, test API reachability
# iOS: Safari Developer Console
# Android: Chrome DevTools

fetch('https://api.yourdomain.com/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

---

## App Store & Play Store Distribution

### iOS App Store

#### 1. Prepare App
- Set version in `tauri.conf.json`
- Create release build: `npm run tauri:ios:build`

#### 2. Create App ID
- Visit [Apple Developer](https://developer.apple.com)
- Create Bundle ID (e.g., `com.yourdomain.timegrid`)
- Update `identifier` in `tauri.conf.json`:

```json
{
  "identifier": "com.yourdomain.timegrid"
}
```

#### 3. Upload via Xcode
```bash
# Open Xcode project
open src-tauri/gen/ios/TimeGrid.xcodeproj

# Product → Archive → Distribute App
```

#### 4. Review & Submit
- Fill in app details, screenshots, description
- Submit for review (takes 24-48 hours typically)

### Google Play Store

#### 1. Create Signing Key
```bash
keytool -genkey -v -keystore ~/timegrid-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias timegrid-key
```

#### 2. Create Play Developer Account
- Visit [Google Play Console](https://play.google.com/console)
- Pay $25 one-time developer registration fee

#### 3. Update Bundle ID
Edit `tauri.conf.json`:

```json
{
  "identifier": "com.yourdomain.timegrid"
}
```

#### 4. Build Release AAB
```bash
npm run tauri:android:build -- --release -- -o aab
```

#### 5. Upload to Play Console
1. Create new app
2. Upload AAB file
3. Fill in app details, screenshots, description
4. Complete compliance forms
5. Submit for review (usually 24 hours)

---

## API Configuration

### Local Development

```env
# Use your machine's local IP
VITE_API_URL=http://192.168.1.100:3000
```

### Testing on Live API

```env
# Use your deployed backend
VITE_API_URL=https://api.yourdomain.com
```

### Using Tunnels (Alternative)

For local development without exposing your machine's IP:

#### Cloudflare Tunnel
```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Start tunnel
cloudflared tunnel run --url http://localhost:3000

# Copy the URL and set as API URL
export VITE_API_URL=https://xxx.trycloudflare.com
```

#### ngrok
```bash
# Install
brew install ngrok

# Expose local API
ngrok http 3000

# Copy the URL
export VITE_API_URL=https://xxx.ngrok.io
```

### CORS Configuration

Backend must allow mobile app origins:

```env
FRONTEND_URLS=http://localhost:8081,tauri://localhost,http://192.168.1.100:8080,https://api.yourdomain.com
```

---

## Troubleshooting

### Build Issues

#### "Command not found: cargo"
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

#### iOS: "Undefined symbols for architecture arm64"
- Missing iOS SDK: `rustup target add aarch64-apple-ios`
- Update Xcode: `xcode-select --install`

#### Android: "Failed to find SDK"
```bash
# Set SDK path
export ANDROID_SDK_ROOT=~/Library/Android/sdk

# Or update in ~/.cargo/config.toml:
[env]
ANDROID_SDK_ROOT = "/path/to/sdk"
```

### Runtime Issues

#### White screen on startup
- Check browser console (DevTools)
- Verify `VITE_API_URL` is correct
- Test API connectivity: `fetch('VITE_API_URL/health')`

#### CORS errors
- Backend `FRONTEND_URLS` must include app origin
- For `http://192.168.1.100:8080`, add to env

#### API timeout
- Check network connectivity
- Use LAN IP instead of localhost
- Test with `curl -v https://api.yourdomain.com/health`

#### Battery drain
- Reduce API polling frequency
- Use efficient database queries
- Implement request caching

### Device-Specific Issues

#### iOS: "Untrusted Developer"
- Settings > General > VPN & Device Management
- Trust the certificate

#### Android: "Installation failed"
```bash
# Clear app data
adb uninstall com.yourdomain.timegrid

# Reinstall
npm run tauri:android:dev
```

#### App crashes on startup
- Check Android Studio Logcat
- Enable debug logging in code

---

## Performance Optimization

### 1. Minimize Bundle
```bash
# Ensure no unused dependencies in package.json
npm audit
npm prune
```

### 2. Network Optimization
- Compress API responses with gzip
- Implement request caching
- Use HTTP/2

### 3. App Optimization
- Code splitting (Vite already does this)
- Lazy load images
- Remove unused libraries

### 4. Platform-Specific
**iOS**: Enable release mode for production
**Android**: Use ProGuard/R8 for code shrinking

---

## Security Checklist

- [ ] API uses HTTPS in production
- [ ] Keystore password is secure and not in version control
- [ ] JWT secret is strong
- [ ] CORS is properly configured
- [ ] No credentials in code or `.env`
- [ ] Dependency vulnerabilities checked (`npm audit`)
- [ ] Update API URL before production release
- [ ] Test on real devices before publishing

---

## Next Steps

- [Desktop Deployment Guide](./DESKTOP_DEPLOYMENT.md)
- [Backend Deployment](./DEPLOY.md#backend-deployment)
- [Frontend Deployment](./DEPLOY.md#frontend-deployment)
- [Apple Developer Program](https://developer.apple.com)
- [Google Play Console](https://play.google.com/console)

---

## Quick Reference

### Commands

| Task | Command |
|------|---------|
| Initialize iOS | `npm run tauri:ios:init` |
| Dev iOS Simulator | `npm run tauri:ios:dev` |
| Build iOS Release | `npm run tauri:ios:build --release` |
| Initialize Android | `npm run tauri:android:init` |
| Dev Android | `npm run tauri:android:dev` |
| Build Android Release | `npm run tauri:android:build --release` |

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.yourdomain.com` |
| `ANDROID_SDK_ROOT` | Android SDK location | `~/Library/Android/sdk` |
| `NDK_HOME` | Android NDK location | `~/Android/ndk/26.0.10792818` |
| `JAVA_HOME` | JDK location | `/usr/libexec/java_home` |
