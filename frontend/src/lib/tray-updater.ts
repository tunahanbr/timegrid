// Background service to keep the menu bar updated with timer state
import { storage } from './storage';

// Check if running in Tauri - must be a function to check dynamically
function isTauri() {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

let updateInterval: number | undefined;
let projectsCache: { id: string; name: string }[] = [];

// Function to get projects - will be set by the app
let getProjects: (() => Promise<{ id: string; name: string }[]>) | null = null;

export function setProjectsGetter(getter: () => Promise<{ id: string; name: string }[]>) {
  getProjects = getter;
}

async function updateTrayTitle() {
  if (!isTauri()) return;

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const timerState = storage.getTimerState();
    
    let elapsed = "";
    let projectName = "";

    if (timerState.isRunning && !timerState.isPaused && timerState.startTime) {
      // Calculate current elapsed time
      const now = Date.now();
      const totalSeconds = timerState.elapsedSeconds + Math.floor((now - timerState.startTime) / 1000);
      
      // Format as HH:MM:SS
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      elapsed = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      console.log(`[Tray Updater] Timer running: ${elapsed}, projectId: ${timerState.currentProjectId}`);
      
      // Get project name
      if (timerState.currentProjectId) {
        // First try cache
        let project = projectsCache.find(p => p.id === timerState.currentProjectId);
        
        // If not in cache and we have a getter, fetch fresh
        if (!project && getProjects) {
          try {
            projectsCache = await getProjects();
            project = projectsCache.find(p => p.id === timerState.currentProjectId);
          } catch (error) {
            console.error('Failed to fetch projects:', error);
          }
        }
        
        if (project) {
          projectName = project.name;
        }
      }
    } else if (timerState.isPaused) {
      // Show paused state
      const totalSeconds = timerState.elapsedSeconds;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      elapsed = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ⏸`;
      
      if (timerState.currentProjectId) {
        const project = projectsCache.find(p => p.id === timerState.currentProjectId);
        if (project) {
          projectName = project.name;
        }
      }
    }

    console.log(`[Tray Updater] Invoking update_tray_title with:`, { elapsed, project: projectName });
    await invoke('update_tray_title', { elapsed, project: projectName });
    console.log(`[Tray Updater] Successfully updated menu bar`);
  } catch (error) {
    console.error('[Tray Updater] Failed to update tray title:', error);
  }
}

export function startTrayUpdater() {
  if (!isTauri()) {
    console.log('[Tray Updater] Not in Tauri environment, skipping');
    return;
  }

  console.log('[Tray Updater] Service starting...');

  // Fetch projects immediately on start
  if (getProjects) {
    getProjects().then(projects => {
      projectsCache = projects;
      console.log(`[Tray Updater] Loaded ${projects.length} projects`);
      updateTrayTitle(); // Update with projects available
    }).catch(error => {
      console.error('[Tray Updater] Failed to fetch initial projects:', error);
      updateTrayTitle(); // Still update, just without project names
    });
  } else {
    console.log('[Tray Updater] No projects getter available yet');
    // Update immediately even without projects
    updateTrayTitle();
  }

  // Update every second
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  updateInterval = window.setInterval(updateTrayTitle, 1000);
  console.log('[Tray Updater] Service started, updating every 1 second');
  
  // Listen for storage changes (from other windows)
  window.addEventListener('storage', (e) => {
    if (e.key === 'timetrack_timer') {
      console.log('[Tray Updater] Timer state changed in storage, updating...');
      updateTrayTitle();
    }
  });
}

export function stopTrayUpdater() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = undefined;
  }
}
