// Offline sync system for Tauri app
// Queues operations when offline and syncs when back online

import { offlineStorage } from './offline-storage';

interface QueuedOperation {
  id: string;
  type: 'add' | 'update' | 'delete' | 'create';
  entity: 'project' | 'entry' | 'tag' | 'client';
  data: any;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = 'offline_queue';
const MAX_RETRIES = 3;

export class OfflineSync {
  private queue: QueuedOperation[] = [];
  private isSyncing = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    this.loadQueue();
    this.setupNetworkListeners();
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('[OfflineSync] Network online, starting sync...');
      this.notifyListeners({ status: 'online', syncing: false });
      this.syncQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineSync] Network offline');
      this.notifyListeners({ status: 'offline', syncing: false });
    });
  }

  queueOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>): string {
    const queuedOp: QueuedOperation = {
      ...operation,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(queuedOp);
    this.saveQueue();
    
    console.log('[OfflineSync] Queued operation:', queuedOp.type, queuedOp.entity);
    this.notifyListeners({ 
      status: navigator.onLine ? 'online' : 'offline', 
      syncing: false,
      queueSize: this.queue.length 
    });

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.syncQueue();
    }

    return queuedOp.id;
  }

  async syncQueue() {
    if (this.isSyncing || this.queue.length === 0) {
      return;
    }

    if (!navigator.onLine) {
      console.log('[OfflineSync] Cannot sync - offline');
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({ status: 'online', syncing: true, queueSize: this.queue.length });

    console.log('[OfflineSync] Starting sync, queue size:', this.queue.length);

    const successfulOps: string[] = [];
    const failedOps: QueuedOperation[] = [];

    for (const operation of this.queue) {
      try {
        await this.executeOperation(operation);
        successfulOps.push(operation.id);
        
        // Remove from offline storage after successful sync
        this.cleanupOfflineData(operation);
        
        console.log('[OfflineSync] Synced operation:', operation.type, operation.entity);
      } catch (error) {
        console.error('[OfflineSync] Failed to sync operation:', operation, error);
        
        operation.retries++;
        if (operation.retries < MAX_RETRIES) {
          failedOps.push(operation);
        } else {
          console.error('[OfflineSync] Max retries reached, dropping operation:', operation);
          // Also clean up offline data for dropped operations
          this.cleanupOfflineData(operation);
        }
      }
    }

    // Update queue with only failed operations that haven't exceeded retries
    this.queue = failedOps;
    this.saveQueue();

    this.isSyncing = false;
    
    // Notify listeners with sync results
    this.notifyListeners({
      status: 'online',
      syncing: false,
      queueSize: this.queue.length,
      lastSync: Date.now(),
      syncedCount: successfulOps.length,
    });

    // Trigger refetch of all data after successful sync
    if (successfulOps.length > 0) {
      this.triggerDataRefresh();
      
      // Show success toast
      this.showSyncSuccessToast(successfulOps.length, failedOps.length);
    }

    console.log('[OfflineSync] Sync complete. Successful:', successfulOps.length, 'Failed:', failedOps.length, 'Queue size:', this.queue.length);
  }

  private async triggerDataRefresh() {
    // Dynamically import to invalidate queries after sync
    try {
      // We'll dispatch a custom event that the App can listen to
      window.dispatchEvent(new CustomEvent('offline-sync-complete'));
      console.log('[OfflineSync] Dispatched sync complete event');
    } catch (error) {
      console.error('[OfflineSync] Failed to dispatch sync event:', error);
    }
  }

  private async showSyncSuccessToast(successCount: number, failedCount: number) {
    try {
      const { toast } = await import('sonner');
      
      if (failedCount > 0) {
        toast.warning(`Synced ${successCount} ${successCount === 1 ? 'item' : 'items'}`, {
          description: `${failedCount} ${failedCount === 1 ? 'item' : 'items'} failed to sync and will be retried`,
        });
      } else {
        toast.success(`All changes synced!`, {
          description: `Successfully synced ${successCount} ${successCount === 1 ? 'item' : 'items'}`,
        });
      }
    } catch (error) {
      console.error('[OfflineSync] Failed to show toast:', error);
    }
  }

  private cleanupOfflineData(operation: QueuedOperation) {
    // Remove offline data after successful sync or max retries
    try {
      switch (operation.entity) {
        case 'project':
          if (operation.type === 'add' || operation.type === 'create') {
            offlineStorage.removeOfflineProject(operation.id);
          }
          break;
        case 'entry':
          if (operation.type === 'add') {
            offlineStorage.removeOfflineEntry(operation.id);
          }
          break;
        case 'client':
          if (operation.type === 'add') {
            offlineStorage.removeOfflineClient(operation.id);
          }
          break;
      }
    } catch (error) {
      console.error('[OfflineSync] Failed to cleanup offline data:', error);
    }
  }

  private async executeOperation(operation: QueuedOperation): Promise<void> {
    // Import the storage functions dynamically to avoid circular dependencies
    const { supabaseStorage } = await import('./supabase-storage');

    console.log('[OfflineSync] ========== EXECUTING OPERATION ==========');
    console.log('[OfflineSync] Type:', operation.type);
    console.log('[OfflineSync] Entity:', operation.entity);
    console.log('[OfflineSync] Data:', JSON.stringify(operation.data, null, 2));

    switch (operation.entity) {
      case 'project':
        if (operation.type === 'add' || operation.type === 'create') {
          console.log('[OfflineSync] Calling addProject with:', operation.data.name);
          const result = await supabaseStorage.addProject(operation.data, operation.data.userId);
          console.log('[OfflineSync] Project added successfully:', result);
        } else if (operation.type === 'update') {
          console.log('[OfflineSync] Calling updateProject:', operation.data.id);
          await supabaseStorage.updateProject(operation.data.id, operation.data.updates);
          console.log('[OfflineSync] Project updated successfully');
        } else if (operation.type === 'delete') {
          console.log('[OfflineSync] Calling deleteProject:', operation.data.id);
          await supabaseStorage.deleteProject(operation.data.id);
          console.log('[OfflineSync] Project deleted successfully');
        }
        break;

      case 'entry':
        if (operation.type === 'add') {
          // Get userId from operation data
          const userId = operation.data.userId;
          if (!userId) throw new Error('userId is required for addEntry');
          console.log('[OfflineSync] Calling addEntry for project:', operation.data.projectId);
          const result = await supabaseStorage.addEntry(operation.data, userId);
          console.log('[OfflineSync] Entry added successfully:', result);
        } else if (operation.type === 'update') {
          console.log('[OfflineSync] Calling updateEntry:', operation.data.id);
          await supabaseStorage.updateEntry(operation.data.id, operation.data.updates);
          console.log('[OfflineSync] Entry updated successfully');
        } else if (operation.type === 'delete') {
          console.log('[OfflineSync] Calling deleteEntry:', operation.data.id);
          await supabaseStorage.deleteEntry(operation.data.id);
          console.log('[OfflineSync] Entry deleted successfully');
        }
        break;

      case 'client':
        if (operation.type === 'add') {
          // Get userId from operation data
          const userId = operation.data.userId;
          if (!userId) throw new Error('userId is required for addClient');
          console.log('[OfflineSync] Calling addClient:', operation.data.name);
          const result = await supabaseStorage.addClient(operation.data, userId);
          console.log('[OfflineSync] Client added successfully:', result);
        } else if (operation.type === 'update') {
          console.log('[OfflineSync] Calling updateClient:', operation.data.id);
          await supabaseStorage.updateClient(operation.data.id, operation.data.updates);
          console.log('[OfflineSync] Client updated successfully');
        } else if (operation.type === 'delete') {
          console.log('[OfflineSync] Calling deleteClient:', operation.data.id);
          await supabaseStorage.deleteClient(operation.data.id);
          console.log('[OfflineSync] Client deleted successfully');
        }
        break;

      default:
        throw new Error(`Unknown entity type: ${operation.entity}`);
    }
    
    console.log('[OfflineSync] ========== OPERATION COMPLETE ==========');
  }

  onStatusChange(callback: (status: SyncStatus) => void) {
    this.listeners.add(callback);
    
    // Immediately notify with current status
    callback({
      status: navigator.onLine ? 'online' : 'offline',
      syncing: this.isSyncing,
      queueSize: this.queue.length,
    });

    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(status: SyncStatus) {
    this.listeners.forEach(callback => callback(status));
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

export interface SyncStatus {
  status: 'online' | 'offline';
  syncing: boolean;
  queueSize?: number;
  lastSync?: number;
  syncedCount?: number;
}

// Singleton instance
export const offlineSync = new OfflineSync();
