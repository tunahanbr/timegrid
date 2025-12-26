/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseStorage, TimeEntry } from "@/lib/supabase-storage";
import { useAuth } from "@/contexts/useAuth";
import { toast } from "sonner";
import { offlineSync } from "@/lib/offline-sync";
import { offlineStorage } from "@/lib/offline-storage";

export function useTimeEntries(filters?: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ["time-entries", user?.id, filters],
    queryFn: async () => {
      try {
        const offlineEntries = await offlineStorage.getOfflineEntries();
        
        // Try to fetch online data - pass userId explicitly
        const onlineEntries = await supabaseStorage.getEntries(filters, user?.id);
        
        // Cache the online data for offline use
        await offlineStorage.setCachedEntries(onlineEntries);
        
        // Merge online and offline entries
        return [...offlineEntries, ...onlineEntries] as TimeEntry[];
      } catch (error) {
        // On error, use cached online data + offline data
        const offlineEntries = await offlineStorage.getOfflineEntries();
        const cachedEntries = await offlineStorage.getCachedEntries();
        
        return [...offlineEntries, ...cachedEntries] as TimeEntry[];
      }
    },
    enabled: !!user,
    staleTime: 0, // Always refetch when invalidated
    retry: false, // Don't retry on failure when offline
  });

  // Real-time subscriptions removed - using polling instead
  // You can implement WebSocket-based real-time updates if needed

  const addMutation = useMutation({
    mutationFn: async (entry: Omit<TimeEntry, "id" | "createdAt">) => {
      try {
        if (!navigator.onLine) {
          // Queue operation when offline
          const queueId = offlineSync.queueOperation({
            type: 'add',
            entity: 'entry',
            data: {
              ...entry,
              userId: user!.id,
            },
          });
          
          // Store offline for immediate UI update
          const offlineEntry = await offlineStorage.addOfflineEntry(entry, queueId);
          
          toast.info("Entry saved offline");
          return offlineEntry;
        }
        return supabaseStorage.addEntry(entry, user!.id);
      } catch (error) {
        throw error;
      }
    },
    onSuccess: async (data) => {
      if (data && 'isOffline' in data) {
        // Offline entry added - invalidate to refetch from offline storage
        const queryKey = ["time-entries", user?.id, filters];
        
        // Invalidate and refetch - this will run the queryFn which now includes offline data
        await queryClient.invalidateQueries({ queryKey });
        
        try {
          await queryClient.refetchQueries({ queryKey });
        } catch (error) {
          // Expected when offline
        }
      } else if (data) {
        // Online entry added - invalidate all time-entries queries to ensure all components update
        await queryClient.invalidateQueries({ 
          queryKey: ["time-entries"],
          refetchType: 'all' 
        });
        
        toast.success("Entry added");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add entry");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TimeEntry> }) => {
      if (!navigator.onLine) {
        // Queue operation when offline
        offlineSync.queueOperation({
          type: 'update',
          entity: 'entry',
          data: { id, updates },
        });
        
        // Update cached entry locally for immediate UI feedback
        const cachedEntries = await offlineStorage.getCachedEntries();
        const updatedCache = cachedEntries.map(e => 
          e.id === id ? { ...e, ...updates } : e
        );
        await offlineStorage.setCachedEntries(updatedCache);
        
        toast.info("Update queued (offline)");
        return { id, updates };
      }
      return supabaseStorage.updateEntry(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries", user?.id, filters] });
      queryClient.refetchQueries({ queryKey: ["time-entries", user?.id, filters] });
      if (navigator.onLine) {
        toast.success("Entry updated");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update entry");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) {
        // Queue operation when offline
        offlineSync.queueOperation({
          type: 'delete',
          entity: 'entry',
          data: { id },
        });
        
        // Remove from cached entries locally for immediate UI feedback
        const cachedEntries = await offlineStorage.getCachedEntries();
        const updatedCache = cachedEntries.filter(e => e.id !== id);
        await offlineStorage.setCachedEntries(updatedCache);
        
        // Also remove from offline entries if it exists there
        const offlineEntries = await offlineStorage.getOfflineEntries();
        const offlineEntry = offlineEntries.find(e => e.id === id);
        if (offlineEntry?.queueId) {
          await offlineStorage.removeOfflineEntry(offlineEntry.queueId);
        }
        
        toast.info("Delete queued (offline)");
        return;
      }
      return supabaseStorage.deleteEntry(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries", user?.id, filters] });
      queryClient.refetchQueries({ queryKey: ["time-entries", user?.id, filters] });
      if (navigator.onLine) {
        toast.success("Entry deleted");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete entry");
    },
  });

  return {
    entries,
    isLoading,
    error,
    addEntry: addMutation.mutate,
    updateEntry: updateMutation.mutate,
    deleteEntry: deleteMutation.mutate,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
