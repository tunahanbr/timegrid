import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Start background tray updater for Tauri
import { startTrayUpdater } from "./lib/tray-updater";

// Initialize tray updater with a delay to ensure Tauri API is loaded
if (typeof window !== 'undefined' && '__TAURI__' in window) {
  setTimeout(() => {
    startTrayUpdater();
  }, 200);
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
