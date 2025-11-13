// Local storage for offline data using Tauri filesystem
// Stores unsynced data locally with no size limits

import { Project, TimeEntry, Client } from './supabase-storage';

// Check if we're running in Tauri
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

export interface OfflineProject extends Omit<Project, 'id' | 'createdAt'> {
  id: string;
  createdAt: string;
  isOffline: true;
  queueId: string; // Reference to queue operation
}

export interface OfflineEntry extends Omit<TimeEntry, 'id' | 'createdAt'> {
  id: string;
  createdAt: string;
  isOffline: true;
  queueId: string;
}

export interface OfflineClient extends Omit<Client, 'id' | 'createdAt'> {
  id: string;
  createdAt: string;
  isOffline: true;
  queueId: string;
}

class OfflineStorage {
  private readonly OFFLINE_DIR = 'offline_data';
  private readonly PROJECTS_FILE = 'projects.json';
  private readonly ENTRIES_FILE = 'entries.json';
  private readonly CLIENTS_FILE = 'clients.json';
  
  // Cache files for online data (persisted locally)
  private readonly CACHED_PROJECTS_FILE = 'cached_projects.json';
  private readonly CACHED_ENTRIES_FILE = 'cached_entries.json';
  private readonly CACHED_CLIENTS_FILE = 'cached_clients.json';

  // Tauri filesystem methods
  private async readFile(filename: string): Promise<any[]> {
    if (!isTauri) {
      // Fallback to localStorage in browser
      const key = `offline_${filename.replace('.json', '')}`;
      try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error(`Failed to read from localStorage:`, error);
        return [];
      }
    }

    try {
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const { appDataDir, join } = await import('@tauri-apps/api/path');
      
      const appDir = await appDataDir();
      const filePath = await join(appDir, this.OFFLINE_DIR, filename);
      
      const contents = await readTextFile(filePath);
      return JSON.parse(contents);
    } catch (error: any) {
      // File doesn't exist or can't be read - return empty array
      if (error.includes?.('No such file') || error.message?.includes('No such file')) {
        return [];
      }
      console.error(`Failed to read ${filename}:`, error);
      return [];
    }
  }

  private async writeFile(filename: string, data: any[]): Promise<void> {
    if (!isTauri) {
      // Fallback to localStorage in browser
      const key = `offline_${filename.replace('.json', '')}`;
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error(`Failed to write to localStorage:`, error);
      }
      return;
    }

    try {
      const { writeTextFile, exists, mkdir } = await import('@tauri-apps/plugin-fs');
      const { appDataDir, join } = await import('@tauri-apps/api/path');
      
      const appDir = await appDataDir();
      const dirPath = await join(appDir, this.OFFLINE_DIR);
      const filePath = await join(dirPath, filename);
      
      // Ensure directory exists
      const dirExists = await exists(dirPath);
      if (!dirExists) {
        await mkdir(dirPath, { recursive: true });
      }
      
      await writeTextFile(filePath, JSON.stringify(data, null, 2));
      console.log(`[OfflineStorage] Wrote ${data.length} items to ${filePath}`);
    } catch (error) {
      console.error(`Failed to write ${filename}:`, error);
      // Fallback to localStorage
      const key = `offline_${filename.replace('.json', '')}`;
      try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`[OfflineStorage] Fell back to localStorage for ${filename}`);
      } catch (e) {
        console.error(`Failed localStorage fallback:`, e);
      }
    }
  }

  // Projects
  async getOfflineProjects(): Promise<OfflineProject[]> {
    return this.readFile(this.PROJECTS_FILE);
  }

  async addOfflineProject(project: Omit<Project, 'id' | 'createdAt'>, queueId: string): Promise<OfflineProject> {
    const offlineProject: OfflineProject = {
      ...project,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      isOffline: true,
      queueId,
    };

    const projects = await this.getOfflineProjects();
    projects.push(offlineProject);
    await this.writeFile(this.PROJECTS_FILE, projects);
    
    console.log('[OfflineStorage] Added offline project:', offlineProject);
    return offlineProject;
  }

  async removeOfflineProject(queueId: string): Promise<void> {
    const projects = await this.getOfflineProjects();
    const filtered = projects.filter(p => p.queueId !== queueId);
    await this.writeFile(this.PROJECTS_FILE, filtered);
    console.log('[OfflineStorage] Removed offline project with queueId:', queueId);
  }

  async clearOfflineProjects(): Promise<void> {
    await this.writeFile(this.PROJECTS_FILE, []);
  }

  // Time Entries
  async getOfflineEntries(): Promise<OfflineEntry[]> {
    return this.readFile(this.ENTRIES_FILE);
  }

  async addOfflineEntry(entry: Omit<TimeEntry, 'id' | 'createdAt'>, queueId: string): Promise<OfflineEntry> {
    const offlineEntry: OfflineEntry = {
      ...entry,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      isOffline: true,
      queueId,
    };

    const entries = await this.getOfflineEntries();
    entries.push(offlineEntry);
    await this.writeFile(this.ENTRIES_FILE, entries);
    
    console.log('[OfflineStorage] Added offline entry:', offlineEntry);
    return offlineEntry;
  }

  async removeOfflineEntry(queueId: string): Promise<void> {
    const entries = await this.getOfflineEntries();
    const filtered = entries.filter(e => e.queueId !== queueId);
    await this.writeFile(this.ENTRIES_FILE, filtered);
    console.log('[OfflineStorage] Removed offline entry with queueId:', queueId);
  }

  async clearOfflineEntries(): Promise<void> {
    await this.writeFile(this.ENTRIES_FILE, []);
  }

  // Clients
  async getOfflineClients(): Promise<OfflineClient[]> {
    return this.readFile(this.CLIENTS_FILE);
  }

  async addOfflineClient(client: Omit<Client, 'id' | 'createdAt'>, queueId: string): Promise<OfflineClient> {
    const offlineClient: OfflineClient = {
      ...client,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      isOffline: true,
      queueId,
    };

    const clients = await this.getOfflineClients();
    clients.push(offlineClient);
    await this.writeFile(this.CLIENTS_FILE, clients);
    
    console.log('[OfflineStorage] Added offline client:', offlineClient);
    return offlineClient;
  }

  async removeOfflineClient(queueId: string): Promise<void> {
    const clients = await this.getOfflineClients();
    const filtered = clients.filter(c => c.queueId !== queueId);
    await this.writeFile(this.CLIENTS_FILE, filtered);
    console.log('[OfflineStorage] Removed offline client with queueId:', queueId);
  }

  async clearOfflineClients(): Promise<void> {
    await this.writeFile(this.CLIENTS_FILE, []);
  }

  // Clear all offline data
  async clearAll(): Promise<void> {
    await this.clearOfflineProjects();
    await this.clearOfflineEntries();
    await this.clearOfflineClients();
    console.log('[OfflineStorage] Cleared all offline data');
  }

  // ========== CACHED ONLINE DATA (for persistence across app restarts) ==========
  
  // Cache Projects (online data persisted locally)
  async getCachedProjects(): Promise<Project[]> {
    return this.readFile(this.CACHED_PROJECTS_FILE);
  }

  async setCachedProjects(projects: Project[]): Promise<void> {
    await this.writeFile(this.CACHED_PROJECTS_FILE, projects);
    console.log('[OfflineStorage] Cached', projects.length, 'projects');
  }

  // Cache Time Entries
  async getCachedEntries(): Promise<TimeEntry[]> {
    return this.readFile(this.CACHED_ENTRIES_FILE);
  }

  async setCachedEntries(entries: TimeEntry[]): Promise<void> {
    await this.writeFile(this.CACHED_ENTRIES_FILE, entries);
    console.log('[OfflineStorage] Cached', entries.length, 'entries');
  }

  // Cache Clients
  async getCachedClients(): Promise<Client[]> {
    return this.readFile(this.CACHED_CLIENTS_FILE);
  }

  async setCachedClients(clients: Client[]): Promise<void> {
    await this.writeFile(this.CACHED_CLIENTS_FILE, clients);
    console.log('[OfflineStorage] Cached', clients.length, 'clients');
  }

  // Clear cached data
  async clearCache(): Promise<void> {
    await this.writeFile(this.CACHED_PROJECTS_FILE, []);
    await this.writeFile(this.CACHED_ENTRIES_FILE, []);
    await this.writeFile(this.CACHED_CLIENTS_FILE, []);
    console.log('[OfflineStorage] Cleared all cached data');
  }
}

export const offlineStorage = new OfflineStorage();
