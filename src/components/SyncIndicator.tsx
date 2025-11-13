import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, Check } from "lucide-react";
import { offlineSync, SyncStatus } from "@/lib/offline-sync";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SyncIndicator() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'online',
    syncing: false,
    queueSize: 0,
  });

  useEffect(() => {
    const unsubscribe = offlineSync.onStatusChange((status) => {
      console.log('[SyncIndicator] Status update:', status);
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  const handleManualSync = () => {
    console.log('[SyncIndicator] Manual sync triggered');
    console.log('[SyncIndicator] Current queue size:', offlineSync.getQueueSize());
    console.log('[SyncIndicator] navigator.onLine:', navigator.onLine);
    offlineSync.syncQueue();
  };

  const getStatusInfo = () => {
    if (syncStatus.status === 'offline') {
      return {
        icon: CloudOff,
        text: 'Offline',
        description: syncStatus.queueSize 
          ? `${syncStatus.queueSize} ${syncStatus.queueSize === 1 ? 'change' : 'changes'} queued`
          : 'Working offline',
        variant: 'secondary' as const,
        className: 'text-muted-foreground',
      };
    }

    if (syncStatus.syncing) {
      return {
        icon: RefreshCw,
        text: 'Syncing',
        description: `Syncing ${syncStatus.queueSize || 0} ${syncStatus.queueSize === 1 ? 'change' : 'changes'}...`,
        variant: 'default' as const,
        className: 'text-primary animate-spin',
      };
    }

    if (syncStatus.queueSize && syncStatus.queueSize > 0) {
      return {
        icon: Cloud,
        text: 'Pending',
        description: `${syncStatus.queueSize} ${syncStatus.queueSize === 1 ? 'change' : 'changes'} to sync`,
        variant: 'secondary' as const,
        className: 'text-orange-500',
      };
    }

    return {
      icon: Check,
      text: 'Synced',
      description: syncStatus.lastSync 
        ? `Last synced ${getTimeAgo(syncStatus.lastSync)}`
        : 'All changes synced',
      variant: 'secondary' as const,
      className: 'text-green-500',
    };
  };

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Badge 
              variant={statusInfo.variant}
              className={cn(
                "flex items-center gap-1.5 cursor-help",
                syncStatus.status === 'offline' && "opacity-70"
              )}
            >
              <Icon className={cn("h-3 w-3", statusInfo.className)} />
              <span className="text-xs font-medium">{statusInfo.text}</span>
            </Badge>
            
            {/* Manual sync button when there are queued items and online */}
            {syncStatus.queueSize! > 0 && syncStatus.status === 'online' && !syncStatus.syncing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualSync}
                className="h-6 px-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Sync Now
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{statusInfo.description}</p>
          {syncStatus.lastSync && (
            <p className="text-xs text-muted-foreground mt-1">
              Last synced: {getTimeAgo(syncStatus.lastSync)}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
