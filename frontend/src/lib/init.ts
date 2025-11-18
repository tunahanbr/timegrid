import { storage } from "./storage";
import { setProjectsGetter } from "./tray-updater";
import { supabaseStorage } from "./supabase-storage";
import { offlineStorage } from "./offline-storage";

// Centralized API base URL
const DEFAULT_PORT = 3000;
const API_URL_OVERRIDE_KEY = 'api_url_override';

function resolveApiUrl() {
  const rawEnv = import.meta.env.VITE_API_URL as string | undefined;
  const envUrl = (rawEnv || '').trim();
  const isAndroid = typeof navigator !== 'undefined' && /Android|Adr/i.test(navigator.userAgent || '');

  // If an explicit env URL is provided, always respect it (no rewriting)
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // No env provided
  if (isAndroid) {
    // Android emulator cannot reach host via localhost; it uses 10.0.2.2
    return `http://10.0.2.2:${DEFAULT_PORT}`;
  }

  // iOS simulator and desktop dev work fine with localhost
  return `http://localhost:${DEFAULT_PORT}`;
}

export const API_URL = resolveApiUrl();

// Runtime API URL helpers
export function getApiUrl(): string {
  try {
    const override = typeof localStorage !== 'undefined' ? localStorage.getItem(API_URL_OVERRIDE_KEY) : null;
    const url = (override || '').trim();
    if (url) {
      return url.replace(/\/$/, '');
    }
  } catch {}
  return API_URL;
}

export function setApiUrlOverride(url: string | null): string {
  const value = (url || '').trim();
  if (!value) {
    clearApiUrlOverride();
    return API_URL;
  }
  try {
    // Basic validation
    const parsed = new URL(value);
    const normalized = parsed.toString().replace(/\/$/, '');
    localStorage.setItem(API_URL_OVERRIDE_KEY, normalized);
    return normalized;
  } catch {
    // If invalid, keep existing
    return getApiUrl();
  }
}

export function clearApiUrlOverride(): void {
  try {
    localStorage.removeItem(API_URL_OVERRIDE_KEY);
  } catch {}
}

export const initializeApp = async () => {
  // Migrate any existing localStorage data to filesystem (Tauri only)
  try {
    await offlineStorage.migrateFromLocalStorage();
  } catch (error) {
    console.error('[Init] Failed to migrate localStorage data:', error);
  }
  
  // No default projects - users start with clean slate
  // Projects will be created by users or loaded from Supabase
  
  // Set up projects getter for tray updater
  setProjectsGetter(async () => {
    try {
      const projects = await supabaseStorage.getProjects();
      return projects.map(p => ({ id: p.id, name: p.name }));
    } catch (error) {
      console.error('Failed to fetch projects for tray:', error);
      // Fallback to localStorage
      return storage.getProjects();
    }
  });
};
