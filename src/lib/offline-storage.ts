// Local storage for offline data
// Stores unsynced data locally and marks it as pending

import { Project, TimeEntry, Client } from './supabase-storage';

const OFFLINE_PROJECTS_KEY = 'offline_projects';
const OFFLINE_ENTRIES_KEY = 'offline_entries';
const OFFLINE_CLIENTS_KEY = 'offline_clients';

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
  // Projects
  getOfflineProjects(): OfflineProject[] {
    try {
      const stored = localStorage.getItem(OFFLINE_PROJECTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load offline projects:', error);
      return [];
    }
  }

  addOfflineProject(project: Omit<Project, 'id' | 'createdAt'>, queueId: string): OfflineProject {
    const offlineProject: OfflineProject = {
      ...project,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      isOffline: true,
      queueId,
    };

    const projects = this.getOfflineProjects();
    projects.push(offlineProject);
    localStorage.setItem(OFFLINE_PROJECTS_KEY, JSON.stringify(projects));
    
    console.log('[OfflineStorage] Added offline project:', offlineProject);
    return offlineProject;
  }

  removeOfflineProject(queueId: string) {
    const projects = this.getOfflineProjects().filter(p => p.queueId !== queueId);
    localStorage.setItem(OFFLINE_PROJECTS_KEY, JSON.stringify(projects));
    console.log('[OfflineStorage] Removed offline project with queueId:', queueId);
  }

  clearOfflineProjects() {
    localStorage.removeItem(OFFLINE_PROJECTS_KEY);
  }

  // Time Entries
  getOfflineEntries(): OfflineEntry[] {
    try {
      const stored = localStorage.getItem(OFFLINE_ENTRIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load offline entries:', error);
      return [];
    }
  }

  addOfflineEntry(entry: Omit<TimeEntry, 'id' | 'createdAt'>, queueId: string): OfflineEntry {
    const offlineEntry: OfflineEntry = {
      ...entry,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      isOffline: true,
      queueId,
    };

    const entries = this.getOfflineEntries();
    entries.push(offlineEntry);
    localStorage.setItem(OFFLINE_ENTRIES_KEY, JSON.stringify(entries));
    
    console.log('[OfflineStorage] Added offline entry:', offlineEntry);
    return offlineEntry;
  }

  removeOfflineEntry(queueId: string) {
    const entries = this.getOfflineEntries().filter(e => e.queueId !== queueId);
    localStorage.setItem(OFFLINE_ENTRIES_KEY, JSON.stringify(entries));
    console.log('[OfflineStorage] Removed offline entry with queueId:', queueId);
  }

  clearOfflineEntries() {
    localStorage.removeItem(OFFLINE_ENTRIES_KEY);
  }

  // Clients
  getOfflineClients(): OfflineClient[] {
    try {
      const stored = localStorage.getItem(OFFLINE_CLIENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load offline clients:', error);
      return [];
    }
  }

  addOfflineClient(client: Omit<Client, 'id' | 'createdAt'>, queueId: string): OfflineClient {
    const offlineClient: OfflineClient = {
      ...client,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      isOffline: true,
      queueId,
    };

    const clients = this.getOfflineClients();
    clients.push(offlineClient);
    localStorage.setItem(OFFLINE_CLIENTS_KEY, JSON.stringify(clients));
    
    console.log('[OfflineStorage] Added offline client:', offlineClient);
    return offlineClient;
  }

  removeOfflineClient(queueId: string) {
    const clients = this.getOfflineClients().filter(c => c.queueId !== queueId);
    localStorage.setItem(OFFLINE_CLIENTS_KEY, JSON.stringify(clients));
    console.log('[OfflineStorage] Removed offline client with queueId:', queueId);
  }

  clearOfflineClients() {
    localStorage.removeItem(OFFLINE_CLIENTS_KEY);
  }

  // Clear all offline data
  clearAll() {
    this.clearOfflineProjects();
    this.clearOfflineEntries();
    this.clearOfflineClients();
    console.log('[OfflineStorage] Cleared all offline data');
  }
}

export const offlineStorage = new OfflineStorage();
