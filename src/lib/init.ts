import { storage } from "./storage";
import { setProjectsGetter } from "./tray-updater";
import { supabaseStorage } from "./supabase-storage";

export const initializeApp = () => {
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
