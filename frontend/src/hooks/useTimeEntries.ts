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
      console.log('[useTimeEntries] Query function called');
      try {
        const offlineEntries = await offlineStorage.getOfflineEntries();
        console.log('[useTimeEntries] Loaded offline entries:', offlineEntries);
        
        // Try to fetch online data - pass userId explicitly
        const onlineEntries = await supabaseStorage.getEntries(filters, user?.id);
        console.log('[useTimeEntries] Loaded online entries:', onlineEntries);
        
        // Cache the online data for offline use
        await offlineStorage.setCachedEntries(onlineEntries);
        
        // Merge online and offline entries
        console.log('[useTimeEntries] Merging entries - offline:', offlineEntries.length, 'online:', onlineEntries.length);
        return [...offlineEntries, ...onlineEntries] as TimeEntry[];
      } catch (error) {
        console.error('[useTimeEntries] Query error:', error);
        
        // On error, use cached online data + offline data
        const offlineEntries = await offlineStorage.getOfflineEntries();
        const cachedEntries = await offlineStorage.getCachedEntries();
        
        console.log('[useTimeEntries] Using cached data - offline:', offlineEntries.length, 'cached:', cachedEntries.length);
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
      console.log('[useTimeEntries] ========== ADD MUTATION CALLED ==========');
      console.log('[useTimeEntries] Entry data:', entry);
      console.log('[useTimeEntries] navigator.onLine:', navigator.onLine);
      console.log('[useTimeEntries] User ID:', user?.id);
      
      try {
        if (!navigator.onLine) {
          console.log('[useTimeEntries] Adding entry offline:', entry);
          
          // Queue operation when offline
          const queueId = offlineSync.queueOperation({
            type: 'add',
            entity: 'entry',
            data: {
              ...entry,
              userId: user!.id,
            },
          });
          
          console.log('[useTimeEntries] Queued with ID:', queueId);
          
          // Store offline for immediate UI update
          const offlineEntry = await offlineStorage.addOfflineEntry(entry, queueId);
          console.log('[useTimeEntries] Stored offline entry:', offlineEntry);
          
          toast.info("Entry saved offline");
          return offlineEntry;
        }
        return supabaseStorage.addEntry(entry, user!.id);
      } catch (error) {
        console.error('[useTimeEntries] Error adding entry:', error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      console.log('[useTimeEntries] Entry added successfully:', data);
      console.log('[useTimeEntries] Current user?.id:', user?.id, 'filters:', filters);
      
      if (data && 'isOffline' in data) {
        // Offline entry added - invalidate to refetch from offline storage
        const queryKey = ["time-entries", user?.id, filters];
        console.log('[useTimeEntries] Invalidating query with key:', queryKey);
        
        // Invalidate and refetch - this will run the queryFn which now includes offline data
        queryClient.invalidateQueries({ queryKey });
        
        try {
          await queryClient.refetchQueries({ queryKey });
          console.log('[useTimeEntries] Refetch completed successfully');
        } catch (error) {
          console.error('[useTimeEntries] Refetch error (expected when offline):', error);
        }
      } else if (data) {
        // Online entry added - optimistically update the cache
        const queryKey = ["time-entries", user?.id, filters];
        
        // Optimistically add the new entry to the cache
        queryClient.setQueryData<TimeEntry[]>(queryKey, (oldEntries = []) => {
          // Check if entry already exists to avoid duplicates
          const exists = oldEntries.some(e => e.id === data.id);
          if (exists) {
            return oldEntries;
          }
          // Add new entry at the beginning (most recent first)
          return [data, ...oldEntries];
        });
        
        // Invalidate to ensure we get the latest data from server (including tags)
        queryClient.invalidateQueries({ queryKey });
        
        // Force refetch to get complete data
        queryClient.refetchQueries({ 
          queryKey,
          type: 'active' // Only refetch active queries
        });
        
        toast.success("Entry added");
      }
    },
    onError: (error: any) => {
      console.error('[useTimeEntries] Mutation error:', error);
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
