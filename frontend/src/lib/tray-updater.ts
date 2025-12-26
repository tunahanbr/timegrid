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
            // Silent fail
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

    await invoke('update_tray_title', { elapsed, project: projectName });
  } catch (error) {
    // Silent fail
  }
}

export function startTrayUpdater() {
  if (!isTauri()) {
    return;
  }

  // Fetch projects immediately on start
  if (getProjects) {
    getProjects().then(projects => {
      projectsCache = projects;
      updateTrayTitle(); // Update with projects available
    }).catch(error => {
      updateTrayTitle(); // Still update, just without project names
    });
  } else {
    // Update immediately even without projects
    updateTrayTitle();
  }

  // Update every second
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  updateInterval = window.setInterval(updateTrayTitle, 1000);
  
  // Listen for storage changes (from other windows)
  window.addEventListener('storage', (e) => {
    if (e.key === 'timetrack_timer') {
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
