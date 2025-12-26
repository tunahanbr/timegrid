import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HardDrive, Database, CloudOff, ChevronDown, ChevronUp } from 'lucide-react';
import { indexedStorage, QuotaInfo } from '@/lib/indexed-storage';
import { analyzeStorage, formatBytes as formatStorageBytes, StorageBreakdown } from '@/lib/storage-analyzer';

export function StorageInfo() {
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<StorageBreakdown[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const loadQuotaInfo = async () => {
      
      // Also load breakdown
      const storageBreakdown = await analyzeStorage();
      setBreakdown(storageBreakdown);
    try {
      const info = await indexedStorage.getQuotaInfo();
      setQuotaInfo(info);
    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotaInfo();
    // Refresh every 30 seconds
    const interval = setInterval(loadQuotaInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !quotaInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const getStorageStatus = () => {
    if (quotaInfo.isPersisted) return 'Unlimited Storage';
    if (quotaInfo.storageType === 'indexeddb') return 'Limited Storage (~50MB)';
    return 'Limited Storage (~10MB)';
  };

  const getProgressColor = () => {
    if (quotaInfo.percentage >= 90) return 'bg-red-500';
    if (quotaInfo.percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {quotaInfo.storageType === 'indexeddb' ? (
            <Database className="h-5 w-5" />
          ) : (
            <HardDrive className="h-5 w-5" />
          )}
          Storage
        </CardTitle>
        <CardDescription>{getStorageStatus()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Used</span>
            <span className="font-medium">
              {formatBytes(quotaInfo.usage)} / {formatBytes(quotaInfo.quota)}
            </span>
          </div>
          <Progress value={quotaInfo.percentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {quotaInfo.percentage.toFixed(1)}% full
          </p>
          
          {breakdown.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => setShowBreakdown(!showBreakdown)}
            >
              {showBreakdown ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide breakdown
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show what's using space
                </>
              )}
            </Button>
          )}
        </div>

        {showBreakdown && breakdown.length > 0 && (
          <div className="bg-muted/50 p-3 rounded space-y-2">
            <p className="text-xs font-medium">Storage Breakdown:</p>
            {breakdown.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground capitalize">
                    {item.category.replace(/_/g, ' ')}
                  </span>
                  <span className="font-mono">
                    {formatStorageBytes(item.size)} ({item.count} items)
                  </span>
                </div>
                <Progress value={item.percentage} className="h-1" />
              </div>
            ))}
          </div>
        )}

        {!quotaInfo.isPersisted && quotaInfo.storageType === 'indexeddb' && quotaInfo.quota > 1024 * 1024 * 1024 && (
          <div className="bg-muted p-3 rounded space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <CloudOff className="h-4 w-4" />
              Protect your data from auto-deletion?
            </p>
            <p className="text-xs text-muted-foreground">
              You already have {formatBytes(quotaInfo.quota)} storage! Click below to prevent the browser from auto-clearing your data.
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              onClick={async () => {
                if (navigator.storage && navigator.storage.persist) {
                  const granted = await navigator.storage.persist();
                  if (granted) {
                    window.dispatchEvent(new CustomEvent('storage-notification', {
                      detail: { message: 'Data protection enabled! Your data won\'t be auto-cleared.', type: 'success' }
                    }));
                  } else {
                    window.dispatchEvent(new CustomEvent('storage-notification', {
                      detail: { message: 'No action needed - you already have plenty of storage! Browser manages this automatically.', type: 'info' }
                    }));
                  }
                  await loadQuotaInfo();
                }
              }}
            >
              Enable Data Protection
            </Button>
          </div>
        )}

        {!quotaInfo.isPersisted && quotaInfo.storageType === 'indexeddb' && quotaInfo.quota <= 1024 * 1024 * 1024 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded space-y-2">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <CloudOff className="h-4 w-4" />
              Limited storage quota
            </p>
            <p className="text-xs text-muted-foreground">
              Your browser allocated only {formatBytes(quotaInfo.quota)}. Enable persistent storage for more space.
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              onClick={async () => {
                if (navigator.storage && navigator.storage.persist) {
                  const granted = await navigator.storage.persist();
                  if (granted) {
                    window.dispatchEvent(new CustomEvent('storage-notification', {
                      detail: { message: 'Storage permission granted! Your quota may increase.', type: 'success' }
                    }));
                  } else {
                    window.dispatchEvent(new CustomEvent('storage-notification', {
                      detail: { message: 'Enable storage permission in browser settings: Site Settings → Permissions → Storage', type: 'warning' }
                    }));
                  }
                  await loadQuotaInfo();
                }
              }}
            >
              Request More Storage
            </Button>
          </div>
        )}

        {quotaInfo.storageType === 'localstorage' && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              Using localStorage fallback
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your browser doesn't support IndexedDB or you denied storage permission. 
              Storage is limited to ~10MB.
            </p>
          </div>
        )}

        {quotaInfo.percentage >= 80 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              Storage running low
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Consider syncing old data to the server or enabling unlimited storage.
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Type:</strong> {quotaInfo.storageType === 'indexeddb' ? 'IndexedDB' : 'localStorage'}</p>
          <p><strong>Status:</strong> {quotaInfo.isPersisted ? 'Persistent' : 'Not persistent'}</p>
          <p className="text-[10px] mt-2">
            ℹ️ Quota is <strong>dynamic</strong> based on available disk space (typically 10-60% of free space). 
            Local data stays cached after syncing for offline access.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
