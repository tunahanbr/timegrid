/* eslint-disable @typescript-eslint/no-explicit-any */
// Local storage for offline data using Tauri filesystem
// Stores unsynced data locally with no size limits

import { Project, TimeEntry, Client } from './supabase-storage';
import { logger } from './logger';

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
  
  // Sync queue file
  private readonly QUEUE_FILE = 'sync_queue.json';

  // Tauri filesystem methods
  private async readFile(filename: string): Promise<any[]> {
    if (!isTauri) {
      // Browser: use localStorage ONLY
      const key = `offline_${filename.replace('.json', '')}`;
      try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        logger.error(`Failed to read from localStorage`, error, { context: 'OfflineStorage', data: { key } });
        return [];
      }
    }

    // Tauri: use filesystem ONLY (no fallback)
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
      logger.error(`Failed to read ${filename} from filesystem`, error, { context: 'OfflineStorage' });
      return [];
    }
  }

  private async writeFile(filename: string, data: any[]): Promise<void> {
    if (!isTauri) {
      // Browser: use localStorage ONLY
      const key = `offline_${filename.replace('.json', '')}`;
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        logger.error(`Failed to write to localStorage`, error, { context: 'OfflineStorage', data: { key } });
        throw error; // Propagate error so caller knows it failed
      }
      return;
    }

    // Tauri: use filesystem ONLY (no fallback)
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
      logger.storageOperation('write', { filename, count: data.length });
    } catch (error) {
      logger.error(`Failed to write ${filename} to filesystem`, error, { context: 'OfflineStorage' });
      throw error; // Propagate error so caller knows it failed
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
    
    logger.offlineOperation('add project', { projectName: offlineProject.name });
    return offlineProject;
  }

  async removeOfflineProject(queueId: string): Promise<void> {
    const projects = await this.getOfflineProjects();
    const filtered = projects.filter(p => p.queueId !== queueId);
    await this.writeFile(this.PROJECTS_FILE, filtered);
    logger.storageOperation('remove project', { queueId });
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
    
    logger.offlineOperation('add entry', { projectId: offlineEntry.projectId });
    return offlineEntry;
  }

  async removeOfflineEntry(queueId: string): Promise<void> {
    const entries = await this.getOfflineEntries();
    const filtered = entries.filter(e => e.queueId !== queueId);
    await this.writeFile(this.ENTRIES_FILE, filtered);
    logger.storageOperation('remove entry', { queueId });
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
    
    logger.offlineOperation('add client', { clientName: offlineClient.name });
    return offlineClient;
  }

  async removeOfflineClient(queueId: string): Promise<void> {
    const clients = await this.getOfflineClients();
    const filtered = clients.filter(c => c.queueId !== queueId);
    await this.writeFile(this.CLIENTS_FILE, filtered);
    logger.storageOperation('remove client', { queueId });
  }

  async clearOfflineClients(): Promise<void> {
    await this.writeFile(this.CLIENTS_FILE, []);
  }

  // Clear all offline data
  async clearAll(): Promise<void> {
    await this.clearOfflineProjects();
    await this.clearOfflineEntries();
    await this.clearOfflineClients();
    logger.storageOperation('clear all');
  }

  // ========== CACHED ONLINE DATA (for persistence across app restarts) ==========
  
  // Cache Projects (online data persisted locally)
  async getCachedProjects(): Promise<Project[]> {
    return this.readFile(this.CACHED_PROJECTS_FILE);
  }

  async setCachedProjects(projects: Project[]): Promise<void> {
    await this.writeFile(this.CACHED_PROJECTS_FILE, projects);
    logger.storageOperation('cache projects', { count: projects.length });
  }

  // Cache Time Entries
  async getCachedEntries(): Promise<TimeEntry[]> {
    return this.readFile(this.CACHED_ENTRIES_FILE);
  }

  async setCachedEntries(entries: TimeEntry[]): Promise<void> {
    await this.writeFile(this.CACHED_ENTRIES_FILE, entries);
    logger.storageOperation('cache entries', { count: entries.length });
  }

  // Cache Clients
  async getCachedClients(): Promise<Client[]> {
    return this.readFile(this.CACHED_CLIENTS_FILE);
  }

  async setCachedClients(clients: Client[]): Promise<void> {
    await this.writeFile(this.CACHED_CLIENTS_FILE, clients);
    logger.storageOperation('cache clients', { count: clients.length });
  }

  // Clear cached data
  async clearCache(): Promise<void> {
    await this.writeFile(this.CACHED_PROJECTS_FILE, []);
    await this.writeFile(this.CACHED_ENTRIES_FILE, []);
    await this.writeFile(this.CACHED_CLIENTS_FILE, []);
    logger.storageOperation('clear cache');
  }
  
  // ========== SYNC QUEUE (for offline operations) ==========
  
  async getSyncQueue(): Promise<any[]> {
    return this.readFile(this.QUEUE_FILE);
  }
  
  async setSyncQueue(queue: any[]): Promise<void> {
    await this.writeFile(this.QUEUE_FILE, queue);
  }
  
  async clearSyncQueue(): Promise<void> {
    await this.writeFile(this.QUEUE_FILE, []);
    logger.storageOperation('clear sync queue');
  }
  
  // ========== MIGRATION HELPER ==========
  
  /**
   * Migrates data from localStorage to filesystem (one-time migration for existing users)
   * Safe to call multiple times - will skip if no localStorage data exists
   */
  async migrateFromLocalStorage(): Promise<void> {
    if (!isTauri) {
      // Skip migration in browser mode
      return;
    }
    
    logger.info('Checking for localStorage data to migrate', { context: 'Migration' });
    
    const filesToMigrate = [
      { localStorageKey: 'offline_projects', file: this.PROJECTS_FILE },
      { localStorageKey: 'offline_entries', file: this.ENTRIES_FILE },
      { localStorageKey: 'offline_clients', file: this.CLIENTS_FILE },
      { localStorageKey: 'offline_cached_projects', file: this.CACHED_PROJECTS_FILE },
      { localStorageKey: 'offline_cached_entries', file: this.CACHED_ENTRIES_FILE },
      { localStorageKey: 'offline_cached_clients', file: this.CACHED_CLIENTS_FILE },
      { localStorageKey: 'offline_queue', file: this.QUEUE_FILE },
    ];
    
    let migratedCount = 0;
    
    for (const { localStorageKey, file } of filesToMigrate) {
      try {
        const data = localStorage.getItem(localStorageKey);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await this.writeFile(file, parsed);
            localStorage.removeItem(localStorageKey); // Clean up after migration
            migratedCount++;
            logger.info(`Migrated ${parsed.length} items`, { 
              context: 'Migration', 
              data: { from: localStorageKey, to: file } 
            });
          }
        }
      } catch (error) {
        logger.error(`Failed to migrate ${localStorageKey}`, error, { context: 'Migration' });
      }
    }
    
    if (migratedCount > 0) {
      logger.info(`Migration complete! Migrated ${migratedCount} files`, { context: 'Migration' });
    } else {
      logger.debug('No localStorage data to migrate', { context: 'Migration' });
    }
  }
}

export const offlineStorage = new OfflineStorage();
