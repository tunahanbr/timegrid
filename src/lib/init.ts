import { storage } from "./storage";
import { setProjectsGetter } from "./tray-updater";
import { supabaseStorage } from "./supabase-storage";
import { offlineStorage } from "./offline-storage";

// Centralized API base URL
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
