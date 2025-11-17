# Mobile (Android & iOS) Build Guide

This app uses Tauri v2, which supports Android and iOS with the same codebase.

## Prerequisites
- Node.js & npm
- Tauri CLI: `npm i -D @tauri-apps/cli`
- Android: Android Studio, SDK, NDK, a device or emulator
- iOS: Xcode, an Apple Developer account, a device or simulator (macOS only)

## Important: API URL
- Mobile apps cannot access `http://localhost:3000` on your laptop.
- Set `VITE_API_URL` to a reachable address (e.g., `https://api.yourdomain`).
- For local dev on device:
  - Use your LAN IP: `VITE_API_URL=http://<your-ip>:3000`
  - Or use a tunnel (Cloudflare Tunnel, ngrok) to expose your API.

## CORS
- Backend allows `tauri://localhost` by default.
- Add your mobile/preview frontend origins to `FRONTEND_URLS` as needed.

## Development Commands
- Android dev: `npm run tauri:android:dev`
- iOS dev: `npm run tauri:ios:dev`

Tips for Android device dev:
- If running the Vite dev server on your laptop: `adb reverse tcp:8080 tcp:8080` forwards the dev port to the device.
- Similarly for API: `adb reverse tcp:3000 tcp:3000` if you insist on localhost-style dev (prefer LAN IP or tunnel).

## Production Builds
- Android: `npm run tauri:android:build`
  - Set up a keystore for signing (Android Studio will guide you).
- iOS: `npm run tauri:ios:build`
  - Requires signing certificates and provisioning profiles.

## Configuration
- `src-tauri/tauri.conf.json` uses `frontendDist` and `devUrl` from the web app.
- Ensure your web app builds with the correct `VITE_API_URL`.
- No extra mobile-specific code is required unless you use native plugins.

## Troubleshooting
- White screen: check that `VITE_API_URL` points to a reachable API.
- CORS errors: confirm the exact origin in `FRONTEND_URLS` and that HTTPS is used in production.
- Build failures: verify Android SDK/NDK paths and Xcode command line tools.