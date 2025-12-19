/**
 * Storage Analyzer - Shows what's taking up space
 */

import { indexedStorage, STORES } from './indexed-storage';

export interface StorageBreakdown {
  category: string;
  size: number;
  count: number;
  percentage: number;
}

export async function analyzeStorage(): Promise<StorageBreakdown[]> {
  const breakdown: StorageBreakdown[] = [];
  let totalSize = 0;

  try {
    // Analyze IndexedDB stores
    for (const [storeName, storeKey] of Object.entries(STORES)) {
      try {
        const items = await indexedStorage.getAll(storeKey);
        const json = JSON.stringify(items);
        const sizeInBytes = new Blob([json]).size;
        
        breakdown.push({
          category: storeName,
          size: sizeInBytes,
          count: items.length,
          percentage: 0, // Will calculate after we have total
        });
        
        totalSize += sizeInBytes;
      } catch (error) {
        console.error(`Failed to analyze ${storeName}:`, error);
      }
    }

    // Analyze localStorage
    let localStorageSize = 0;
    let localStorageCount = 0;
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            localStorageSize += new Blob([key + value]).size;
            localStorageCount++;
          }
        }
      }
      
      breakdown.push({
        category: 'localStorage',
        size: localStorageSize,
        count: localStorageCount,
        percentage: 0,
      });
      
      totalSize += localStorageSize;
    } catch (error) {
      console.error('Failed to analyze localStorage:', error);
    }

    // Analyze Cache API (service workers, HTTP cache)
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        let totalCacheSize = 0;
        let totalCacheCount = 0;

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          
          totalCacheCount += requests.length;
          
          // Estimate cache size (this is approximate)
          for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              totalCacheSize += blob.size;
            }
          }
        }

        if (totalCacheSize > 0) {
          breakdown.push({
            category: 'Browser Cache (HTTP/Assets)',
            size: totalCacheSize,
            count: totalCacheCount,
            percentage: 0,
          });
          
          totalSize += totalCacheSize;
        }
      }
    } catch (error) {
      console.error('Failed to analyze Cache API:', error);
    }

    // Add note about unaccounted storage
    const estimate = await navigator.storage.estimate();
    const reportedUsage = estimate.usage || 0;
    const analyzedTotal = totalSize;
    const unaccounted = reportedUsage - analyzedTotal;

    if (unaccounted > 1024 * 10) { // More than 10KB unaccounted
      breakdown.push({
        category: 'Other Browser Storage',
        size: unaccounted,
        count: 0,
        percentage: 0,
      });
      totalSize = reportedUsage; // Use reported total for percentage calc
    }

    // Calculate percentages
    breakdown.forEach(item => {
      item.percentage = totalSize > 0 ? (item.size / totalSize) * 100 : 0;
    });

    // Sort by size descending
    breakdown.sort((a, b) => b.size - a.size);

    return breakdown;
  } catch (error) {
    console.error('Failed to analyze storage:', error);
    return [];
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}
