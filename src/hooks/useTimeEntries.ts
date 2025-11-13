import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseStorage, TimeEntry } from "@/lib/supabase-storage";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { offlineSync } from "@/lib/offline-sync";
import { offlineStorage } from "@/lib/offline-storage";

export function useTimeEntries(filters?: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ["time-entries", user?.id, filters],
    queryFn: async () => {
      const onlineEntries = await supabaseStorage.getEntries(filters);
      const offlineEntries = offlineStorage.getOfflineEntries();
      
      // Merge online and offline entries
      return [...offlineEntries, ...onlineEntries] as TimeEntry[];
    },
    enabled: !!user,
  });

  // Real-time subscriptions removed - using polling instead
  // You can implement WebSocket-based real-time updates if needed

  const addMutation = useMutation({
    mutationFn: async (entry: Omit<TimeEntry, "id" | "createdAt">) => {
      if (!navigator.onLine) {
        // Queue operation when offline
        const queueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await offlineSync.queueOperation({
          type: 'add',
          entity: 'entry',
          data: {
            ...entry,
            userId: user!.id,
          },
        });
        
        // Store offline for immediate UI update
        const offlineEntry = offlineStorage.addOfflineEntry(entry, queueId);
        toast.info("Entry saved offline");
        return offlineEntry;
      }
      return supabaseStorage.addEntry(entry, user!.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      if (data && 'isOffline' in data) {
        // Offline entry added
      } else if (data !== null) {
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
        await offlineSync.queueOperation({
          type: 'update',
          entity: 'entry',
          data: { id, updates },
        });
        toast.info("Update queued (offline)");
        return;
      }
      return supabaseStorage.updateEntry(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
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
        await offlineSync.queueOperation({
          type: 'delete',
          entity: 'entry',
          data: { id },
        });
        toast.info("Delete queued (offline)");
        return;
      }
      return supabaseStorage.deleteEntry(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
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
