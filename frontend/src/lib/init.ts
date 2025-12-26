import { storage } from "./storage";
import { setProjectsGetter } from "./tray-updater";
import { supabaseStorage } from "./supabase-storage";
import { offlineStorage } from "./offline-storage";
import { indexedStorage } from "./indexed-storage";
import { logger } from "./logger";

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
  } catch (err) {
    logger.debug('Failed to read API URL override from storage', err);
  }
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
  } catch (err) {
    logger.debug('Invalid API URL override', err);
    return getApiUrl();
  }
}

export function clearApiUrlOverride(): void {
  try {
    localStorage.removeItem(API_URL_OVERRIDE_KEY);
  } catch (err) {
    logger.debug('Failed to clear API URL override', err);
  }
}

export const initializeApp = async () => {
  try {
    logger.info('Initializing app...', { context: 'init' });

    // Initialize IndexedDB storage (with localStorage fallback)
    // This will ask user for storage permission if needed
    await indexedStorage.initialize();
    
    const storageType = indexedStorage.getStorageType();
    logger.info('Storage initialized', { 
      context: 'init',
      data: { storageType }
    });

    // Migrate any existing localStorage data to filesystem (Tauri only)
    await offlineStorage.migrateFromLocalStorage();
    
    // Set up projects getter for tray updater
    setProjectsGetter(async () => {
      try {
        const projects = await supabaseStorage.getProjects();
        return projects.map(p => ({ id: p.id, name: p.name }));
      } catch (error) {
        // Fallback to localStorage
        return storage.getProjects();
      }
    });

    logger.info('App initialized successfully', { context: 'init' });
  } catch (error) {
    logger.error('Failed to initialize app', error, { context: 'init' });
    // Don't throw - let app continue with degraded functionality
  }
};
