import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseStorage, Client } from "@/lib/supabase-storage";
import { useAuth } from "@/contexts/AuthContext";
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
        const onlineClients = await supabaseStorage.getClients();
        const offlineClients = offlineStorage.getOfflineClients();
        
        // Merge online and offline clients
        return [...offlineClients, ...onlineClients] as Client[];
      } catch (error: any) {
        // If database doesn't exist yet, return offline clients only
        if (error.code === 'PGRST116' || error.message?.includes('404')) {
          console.warn('Database tables not set up yet. Run migration first.');
          return offlineStorage.getOfflineClients() as Client[];
        }
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: 1, // Only retry once
    retryDelay: 500, // Wait 500ms before retry
  });

  const addMutation = useMutation({
    mutationFn: async (client: Omit<Client, "id" | "createdAt">) => {
      if (!navigator.onLine) {
        // Queue operation when offline
        const queueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await offlineSync.queueOperation({
          type: 'add',
          entity: 'client',
          data: {
            ...client,
            userId: user!.id,
          },
        });
        
        // Store offline for immediate UI update
        const offlineClient = offlineStorage.addOfflineClient(client, queueId);
        toast.info("Client saved offline");
        return offlineClient;
      }
      return supabaseStorage.addClient(client, user!.id);
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
      // Rollback on error
      if (context?.previousClients) {
        queryClient.setQueryData(["clients", user?.id], context.previousClients);
      }
      toast.error(error.message || "Failed to create client");
    },
    onSuccess: (data) => {
      if (data && 'isOffline' in data) {
        // Offline client added
      } else if (data !== null) {
        toast.success("Client created");
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", user?.id] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Client> }) => {
      if (!navigator.onLine) {
        // Queue operation when offline
        await offlineSync.queueOperation({
          type: 'update',
          entity: 'client',
          data: { id, updates },
        });
        toast.info("Update queued (offline)");
        return;
      }
      return supabaseStorage.updateClient(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
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
        await offlineSync.queueOperation({
          type: 'delete',
          entity: 'client',
          data: { id },
        });
        toast.info("Delete queued (offline)");
        return;
      }
      return supabaseStorage.deleteClient(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
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
