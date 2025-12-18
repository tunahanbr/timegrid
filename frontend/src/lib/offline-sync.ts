// Offline sync system for Tauri app
// Queues operations when offline and syncs when back online

import { offlineStorage } from './offline-storage';
import { logger } from './logger';

interface QueuedOperation {
  id: string;
  type: 'add' | 'update' | 'delete' | 'create';
  entity: 'project' | 'entry' | 'tag' | 'client';
  data: any;
  timestamp: number;
  retries: number;
}

const MAX_RETRIES = 3;

export class OfflineSync {
  private queue: QueuedOperation[] = [];
  private isSyncing = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    this.loadQueue();
    this.setupNetworkListeners();
  }

  private async loadQueue() {
    try {
      this.queue = await offlineStorage.getSyncQueue();
      logger.info(`Loaded queue with ${this.queue.length} items`, { context: 'OfflineSync' });
    } catch (error) {
      logger.error('Failed to load queue', error, { context: 'OfflineSync' });
      this.queue = [];
    }
  }

  private async saveQueue() {
    try {
      await offlineStorage.setSyncQueue(this.queue);
    } catch (error) {
      logger.error('Failed to save queue', error, { context: 'OfflineSync' });
    }
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      logger.info('Network online, starting sync', { context: 'OfflineSync' });
      this.notifyListeners({ status: 'online', syncing: false });
      this.syncQueue();
    });

    window.addEventListener('offline', () => {
      logger.info('Network offline', { context: 'OfflineSync' });
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
    
    // Save queue asynchronously (don't block)
    this.saveQueue().catch(error => {
      logger.error('Failed to save queue after queueOperation', error, { context: 'OfflineSync' });
    });
    
    logger.offlineOperation('queued', { type: queuedOp.type, entity: queuedOp.entity });
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
      logger.debug('Cannot sync - offline', { context: 'OfflineSync' });
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({ status: 'online', syncing: true, queueSize: this.queue.length });

    logger.syncStart(this.queue.length);

    const successfulOps: string[] = [];
    const failedOps: QueuedOperation[] = [];

    for (const operation of this.queue) {
      try {
        await this.executeOperation(operation);
        successfulOps.push(operation.id);
        
        // Remove from offline storage after successful sync
        this.cleanupOfflineData(operation);
        
        logger.debug(`Synced operation: ${operation.type} ${operation.entity}`, { context: 'OfflineSync' });
        
        // Add a small delay between operations to avoid rate limiting (100ms)
        if (this.queue.indexOf(operation) < this.queue.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        logger.error(`Failed to sync operation: ${operation.type} ${operation.entity}`, error, { context: 'OfflineSync' });
        
        operation.retries++;
        if (operation.retries < MAX_RETRIES) {
          failedOps.push(operation);
        } else {
          logger.warn(`Max retries reached, dropping operation: ${operation.type} ${operation.entity}`, { context: 'OfflineSync' });
          // Also clean up offline data for dropped operations
          this.cleanupOfflineData(operation);
        }
      }
    }

    // Update queue with only failed operations that haven't exceeded retries
    this.queue = failedOps;
    
    // Save queue asynchronously
    await this.saveQueue();

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

    logger.syncComplete(successfulOps.length, failedOps.length);
  }

  private async triggerDataRefresh() {
    // Dynamically import to invalidate queries after sync
    try {
      // We'll dispatch a custom event that the App can listen to
      window.dispatchEvent(new CustomEvent('offline-sync-complete'));
      logger.debug('Dispatched sync complete event', { context: 'OfflineSync' });
    } catch (error) {
      logger.error('Failed to dispatch sync event', error, { context: 'OfflineSync' });
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
      logger.error('Failed to show toast', error, { context: 'OfflineSync' });
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
      logger.error('Failed to cleanup offline data', error, { context: 'OfflineSync' });
    }
  }  private async executeOperation(operation: QueuedOperation): Promise<void> {
    // Import the storage functions dynamically to avoid circular dependencies
    const { supabaseStorage } = await import('./supabase-storage');

    logger.debug('Executing operation', { 
      context: 'OfflineSync', 
      data: { type: operation.type, entity: operation.entity } 
    });

    switch (operation.entity) {
      case 'project':
        if (operation.type === 'add' || operation.type === 'create') {
          const result = await supabaseStorage.addProject(operation.data, operation.data.userId);
          logger.debug('Project added successfully', { context: 'OfflineSync', data: { id: result?.id } });
        } else if (operation.type === 'update') {
          await supabaseStorage.updateProject(operation.data.id, operation.data.updates);
          logger.debug('Project updated successfully', { context: 'OfflineSync' });
        } else if (operation.type === 'delete') {
          await supabaseStorage.deleteProject(operation.data.id);
          logger.debug('Project deleted successfully', { context: 'OfflineSync' });
        }
        break;

      case 'entry':
        if (operation.type === 'add') {
          // Get userId from operation data
          const userId = operation.data.userId;
          if (!userId) throw new Error('userId is required for addEntry');
          const result = await supabaseStorage.addEntry(operation.data, userId);
          logger.debug('Entry added successfully', { context: 'OfflineSync', data: { id: result?.id } });
        } else if (operation.type === 'update') {
          await supabaseStorage.updateEntry(operation.data.id, operation.data.updates);
          logger.debug('Entry updated successfully', { context: 'OfflineSync' });
        } else if (operation.type === 'delete') {
          await supabaseStorage.deleteEntry(operation.data.id);
          logger.debug('Entry deleted successfully', { context: 'OfflineSync' });
        }
        break;

      case 'client':
        if (operation.type === 'add') {
          // Get userId from operation data
          const userId = operation.data.userId;
          if (!userId) throw new Error('userId is required for addClient');
          const result = await supabaseStorage.addClient(operation.data, userId);
          logger.debug('Client added successfully', { context: 'OfflineSync', data: { id: result?.id } });
        } else if (operation.type === 'update') {
          await supabaseStorage.updateClient(operation.data.id, operation.data.updates);
          logger.debug('Client updated successfully', { context: 'OfflineSync' });
        } else if (operation.type === 'delete') {
          await supabaseStorage.deleteClient(operation.data.id);
          logger.debug('Client deleted successfully', { context: 'OfflineSync' });
        }
        break;

      default:
        throw new Error(`Unknown entity type: ${operation.entity}`);
    }
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
