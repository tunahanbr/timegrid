/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseStorage, Client } from "@/lib/supabase-storage";
import { useAuth } from "@/contexts/useAuth";
import { toast } from "sonner";
import { offlineSync } from "@/lib/offline-sync";
import { offlineStorage } from "@/lib/offline-storage";

export function useClients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      try {
        const offlineClients = await offlineStorage.getOfflineClients();
        
        // Try to fetch online data
        const onlineClients = await supabaseStorage.getClients();
        
        // Cache the online data for offline use
        await offlineStorage.setCachedClients(onlineClients);
        
        // Merge online and offline clients
        console.log('[useClients] Merging clients - offline:', offlineClients.length, 'online:', onlineClients.length);
        return [...offlineClients, ...onlineClients] as Client[];
      } catch (error: any) {
        console.error('[useClients] Query error:', error);
        
        // On error, use cached online data + offline data
        const offlineClients = await offlineStorage.getOfflineClients();
        const cachedClients = await offlineStorage.getCachedClients();
        
        if (error.code === 'PGRST116' || error.message?.includes('404')) {
          console.warn('Database tables not set up yet. Run migration first.');
        }
        
        console.log('[useClients] Using cached data - offline:', offlineClients.length, 'cached:', cachedClients.length);
        return [...offlineClients, ...cachedClients] as Client[];
      }
    },
    enabled: !!user,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: false, // Don't retry on failure when offline
  });

  const addMutation = useMutation({
    mutationFn: async (client: Omit<Client, "id" | "createdAt">) => {
      try {
        if (!navigator.onLine) {
          console.log('[useClients] Adding client offline:', client);
          
          // Queue operation when offline
          const queueId = offlineSync.queueOperation({
            type: 'add',
            entity: 'client',
            data: {
              ...client,
              userId: user!.id,
            },
          });
          
          console.log('[useClients] Queued with ID:', queueId);
          
          // Store offline for immediate UI update
          const offlineClient = await offlineStorage.addOfflineClient(client, queueId);
          console.log('[useClients] Stored offline client:', offlineClient);
          
          toast.info("Client saved offline");
          return offlineClient;
        }
        return supabaseStorage.addClient(client, user!.id);
      } catch (error) {
        console.error('[useClients] Error adding client:', error);
        throw error;
      }
    },
    onMutate: async (newClient) => {
      // Only do optimistic updates when online
      if (!navigator.onLine) return;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["clients", user?.id] });
      
      // Snapshot previous value
      const previousClients = queryClient.getQueryData(["clients", user?.id]);
      
      // Optimistically update with temporary ID
      const optimisticClient = {
        ...newClient,
        id: `temp-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      
      queryClient.setQueryData(["clients", user?.id], (old: Client[] = []) => 
        [optimisticClient, ...old]
      );
      
      return { previousClients };
    },
    onError: (error: any, variables, context) => {
      console.error('[useClients] Mutation error:', error);
      // Rollback on error
      if (context?.previousClients) {
        queryClient.setQueryData(["clients", user?.id], context.previousClients);
      }
      toast.error(error.message || "Failed to create client");
    },
    onSuccess: (data) => {
      console.log('[useClients] Client added successfully:', data);
      console.log('[useClients] Current user?.id:', user?.id);
      
      if (data && 'isOffline' in data) {
        // Offline client added - invalidate to refetch from offline storage
        const queryKey = ["clients", user?.id];
        console.log('[useClients] Invalidating query with key:', queryKey);
        
        // Invalidate and refetch - this will run the queryFn which now includes offline data
        queryClient.invalidateQueries({ queryKey });
        queryClient.refetchQueries({ queryKey });
      } else if (data !== null) {
        // Online client added
        toast.success("Client created");
      }
    },
    onSettled: () => {
      // Only invalidate when online to avoid unnecessary refetches
      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["clients", user?.id] });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Client> }) => {
      if (!navigator.onLine) {
        // Queue operation when offline
        offlineSync.queueOperation({
          type: 'update',
          entity: 'client',
          data: { id, updates },
        });
        
        // Update cached client locally for immediate UI feedback
        const cachedClients = await offlineStorage.getCachedClients();
        const updatedCache = cachedClients.map(c => 
          c.id === id ? { ...c, ...updates } : c
        );
        await offlineStorage.setCachedClients(updatedCache);
        
        toast.info("Update queued (offline)");
        return { id, updates };
      }
      return supabaseStorage.updateClient(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.refetchQueries({ queryKey: ["clients"] });
      if (navigator.onLine) {
        toast.success("Client updated");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update client");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) {
        // Queue operation when offline
        offlineSync.queueOperation({
          type: 'delete',
          entity: 'client',
          data: { id },
        });
        
        // Remove from cached clients locally for immediate UI feedback
        const cachedClients = await offlineStorage.getCachedClients();
        const updatedCache = cachedClients.filter(c => c.id !== id);
        await offlineStorage.setCachedClients(updatedCache);
        
        // Also remove from offline clients if it exists there
        const offlineClients = await offlineStorage.getOfflineClients();
        const offlineClient = offlineClients.find(c => c.id === id);
        if (offlineClient?.queueId) {
          await offlineStorage.removeOfflineClient(offlineClient.queueId);
        }
        
        toast.info("Delete queued (offline)");
        return;
      }
      return supabaseStorage.deleteClient(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.refetchQueries({ queryKey: ["clients"] });
      if (navigator.onLine) {
        toast.success("Client deleted");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete client");
    },
  });

  return {
    clients,
    isLoading,
    error,
    addClient: addMutation.mutate,
    updateClient: updateMutation.mutate,
    deleteClient: deleteMutation.mutate,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
