import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Start background tray updater for Tauri
import { startTrayUpdater } from "./lib/tray-updater";

// Initialize tray updater with a delay to ensure Tauri API is loaded
if (typeof window !== 'undefined' && '__TAURI__' in window) {
  console.log('[Main] Tauri environment detected, initializing tray updater...');
  setTimeout(() => {
    startTrayUpdater();
  }, 200);
} else {
  console.log('[Main] Not in Tauri environment');
}

createRoot(document.getElementById("root")!).render(<App />);
