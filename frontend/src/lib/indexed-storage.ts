/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * IndexedDB Storage Layer with localStorage fallback
 * 
 * Features:
 * - IndexedDB for unlimited storage (asks user permission)
 * - Falls back to localStorage if user denies or browser doesn't support
 * - Quota monitoring and warnings
 * - Automatic migration from localStorage to IndexedDB
 */

import { logger } from './logger';

const DB_NAME = 'time_brutalist_db';
const DB_VERSION = 1;
const STORES = {
  ENTRIES: 'time_entries',
  PROJECTS: 'projects',
  CLIENTS: 'clients',
  TAGS: 'tags',
  QUEUE: 'sync_queue',
  CACHE: 'cached_data',
  SESSION: 'session_data',
} as const;

type StoreName = typeof STORES[keyof typeof STORES];

export type StorageType = 'indexeddb' | 'localstorage';

export interface QuotaInfo {
  usage: number;
  quota: number;
  percentage: number;
  storageType: StorageType;
  isPersisted: boolean;
}

class IndexedStorage {
  private db: IDBDatabase | null = null;
  private storageType: StorageType = 'localstorage';
  private initPromise: Promise<void> | null = null;
  private quotaWarningShown = false;

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    // Check if IndexedDB is supported
    if (!window.indexedDB) {
      logger.warn('IndexedDB not supported, using localStorage', { context: 'IndexedStorage' });
      this.storageType = 'localstorage';
      return;
    }

    try {
      // Try to open IndexedDB
      await this._openDatabase();
      this.storageType = 'indexeddb';
      logger.info('IndexedDB initialized successfully', { context: 'IndexedStorage' });

      // Request persistent storage (asks user permission)
      await this._requestPersistentStorage();

      // Migrate data from localStorage if exists
      await this._migrateFromLocalStorage();
    } catch (error) {
      logger.error('Failed to initialize IndexedDB, falling back to localStorage', error, { 
        context: 'IndexedStorage' 
      });
      this.storageType = 'localstorage';
    }
  }

  private async _openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`IndexedDB open failed: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            // Add indexes for common queries
            if (storeName === STORES.ENTRIES) {
              store.createIndex('date', 'date', { unique: false });
              store.createIndex('projectId', 'projectId', { unique: false });
            }
            if (storeName === STORES.PROJECTS || storeName === STORES.CLIENTS) {
              store.createIndex('name', 'name', { unique: false });
            }
          }
        });

        logger.info('IndexedDB schema created/upgraded', { 
          context: 'IndexedStorage',
          data: { version: DB_VERSION }
        });
      };
    });
  }

  private async _requestPersistentStorage(): Promise<void> {
    if (!navigator.storage || !navigator.storage.persist) {
      logger.warn('Storage API not supported', { context: 'IndexedStorage' });
      return;
    }

    try {
      // Check if already persisted
      const isPersisted = await navigator.storage.persisted();
      
      if (!isPersisted) {
        // Request persistent storage (shows permission prompt)
        const granted = await navigator.storage.persist();
        
        if (granted) {
          logger.info('Persistent storage granted', { context: 'IndexedStorage' });
          // Show success notification
          this._notifyUser('Storage permission granted! Your data is now unlimited.', 'success');
        } else {
          logger.warn('Persistent storage denied by user', { context: 'IndexedStorage' });
          // Show info about limited storage
          this._notifyUser('Using limited storage (~50MB). You can enable unlimited storage in browser settings.', 'info');
        }
      } else {
        logger.info('Storage already persisted', { context: 'IndexedStorage' });
      }
    } catch (error) {
      logger.error('Failed to request persistent storage', error, { context: 'IndexedStorage' });
    }
  }

  private _notifyUser(message: string, type: 'success' | 'info' | 'warning' | 'error'): void {
    // Dispatch custom event that UI can listen to
    window.dispatchEvent(new CustomEvent('storage-notification', {
      detail: { message, type }
    }));
  }

  private async _migrateFromLocalStorage(): Promise<void> {
    try {
      // Check if there's data in localStorage to migrate
      const lsKeys = [
        'timetrack_entries',
        'timetrack_projects',
        'offline_projects',
        'offline_entries',
        'offline_clients',
      ];

      let migrated = false;

      for (const key of lsKeys) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Determine target store
              let storeName: StoreName;
              if (key.includes('entries')) storeName = STORES.ENTRIES;
              else if (key.includes('projects')) storeName = STORES.PROJECTS;
              else if (key.includes('clients')) storeName = STORES.CLIENTS;
              else continue;

              // Migrate to IndexedDB
              await this._bulkPut(storeName, parsed);
              
              // Clear from localStorage after successful migration
              localStorage.removeItem(key);
              migrated = true;
            }
          } catch (error) {
            logger.error(`Failed to migrate ${key}`, error, { context: 'IndexedStorage' });
          }
        }
      }

      if (migrated) {
        logger.info('Data migrated from localStorage to IndexedDB', { context: 'IndexedStorage' });
        this._notifyUser('Data upgraded to unlimited storage!', 'success');
      }
    } catch (error) {
      logger.error('Migration from localStorage failed', error, { context: 'IndexedStorage' });
    }
  }

  // Get current storage type
  getStorageType(): StorageType {
    return this.storageType;
  }

  // Check quota and usage
  async getQuotaInfo(): Promise<QuotaInfo> {
    if (!navigator.storage || !navigator.storage.estimate) {
      // Fallback for browsers without Storage API
      return {
        usage: 0,
        quota: 10 * 1024 * 1024, // Assume 10MB for localStorage
        percentage: 0,
        storageType: this.storageType,
        isPersisted: false,
      };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const isPersisted = await navigator.storage.persisted();
      
      const usage = estimate.usage || 0;
      const quota = estimate.quota || (this.storageType === 'localstorage' ? 10 * 1024 * 1024 : 50 * 1024 * 1024);
      const percentage = (usage / quota) * 100;

      // Show warning if approaching limit (80%+)
      if (percentage >= 80 && !this.quotaWarningShown) {
        this.quotaWarningShown = true;
        this._notifyUser(
          `Storage ${percentage.toFixed(0)}% full (${this._formatBytes(usage)} / ${this._formatBytes(quota)}). Consider syncing data to server.`,
          'warning'
        );
      }

      return {
        usage,
        quota,
        percentage,
        storageType: this.storageType,
        isPersisted,
      };
    } catch (error) {
      logger.error('Failed to get quota info', error, { context: 'IndexedStorage' });
      return {
        usage: 0,
        quota: 0,
        percentage: 0,
        storageType: this.storageType,
        isPersisted: false,
      };
    }
  }

  private _formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  // CRUD Operations
  async get<T = any>(storeName: StoreName, id: string): Promise<T | null> {
    await this.initialize();

    if (this.storageType === 'localstorage') {
      return this._getFromLocalStorage(storeName, id);
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T = any>(storeName: StoreName): Promise<T[]> {
    await this.initialize();

    if (this.storageType === 'localstorage') {
      return this._getAllFromLocalStorage(storeName);
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T = any>(storeName: StoreName, value: T): Promise<void> {
    await this.initialize();

    if (this.storageType === 'localstorage') {
      return this._putToLocalStorage(storeName, value);
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async _bulkPut<T = any>(storeName: StoreName, values: T[]): Promise<void> {
    if (this.storageType === 'localstorage') {
      for (const value of values) {
        await this._putToLocalStorage(storeName, value);
      }
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      for (const value of values) {
        store.put(value);
      }
    });
  }

  async delete(storeName: StoreName, id: string): Promise<void> {
    await this.initialize();

    if (this.storageType === 'localstorage') {
      return this._deleteFromLocalStorage(storeName, id);
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: StoreName): Promise<void> {
    await this.initialize();

    if (this.storageType === 'localstorage') {
      return this._clearLocalStorage(storeName);
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // localStorage fallback methods
  private _getLocalStorageKey(storeName: StoreName): string {
    return `idb_fallback_${storeName}`;
  }

  private _getFromLocalStorage<T>(storeName: StoreName, id: string): T | null {
    try {
      const key = this._getLocalStorageKey(storeName);
      const data = localStorage.getItem(key);
      if (!data) return null;

      const items = JSON.parse(data) as T[];
      return items.find((item: any) => item.id === id) || null;
    } catch (error) {
      logger.error('LocalStorage get failed', error, { context: 'IndexedStorage' });
      return null;
    }
  }

  private _getAllFromLocalStorage<T>(storeName: StoreName): T[] {
    try {
      const key = this._getLocalStorageKey(storeName);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('LocalStorage getAll failed', error, { context: 'IndexedStorage' });
      return [];
    }
  }

  private _putToLocalStorage<T>(storeName: StoreName, value: T): void {
    try {
      const key = this._getLocalStorageKey(storeName);
      const items = this._getAllFromLocalStorage<T>(storeName);
      const index = items.findIndex((item: any) => item.id === (value as any).id);
      
      if (index >= 0) {
        items[index] = value;
      } else {
        items.push(value);
      }

      localStorage.setItem(key, JSON.stringify(items));
    } catch (error) {
      logger.error('LocalStorage put failed', error, { context: 'IndexedStorage' });
      throw error;
    }
  }

  private _deleteFromLocalStorage(storeName: StoreName, id: string): void {
    try {
      const key = this._getLocalStorageKey(storeName);
      const items = this._getAllFromLocalStorage(storeName);
      const filtered = items.filter((item: any) => item.id !== id);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (error) {
      logger.error('LocalStorage delete failed', error, { context: 'IndexedStorage' });
      throw error;
    }
  }

  private _clearLocalStorage(storeName: StoreName): void {
    try {
      const key = this._getLocalStorageKey(storeName);
      localStorage.removeItem(key);
    } catch (error) {
      logger.error('LocalStorage clear failed', error, { context: 'IndexedStorage' });
      throw error;
    }
  }
}

// Export singleton instance
export const indexedStorage = new IndexedStorage();

// Export store names for consumers
export { STORES };
