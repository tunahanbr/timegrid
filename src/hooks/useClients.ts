import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseStorage, Client } from "@/lib/supabase-storage";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useClients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      try {
        return await supabaseStorage.getClients();
      } catch (error: any) {
        // If database doesn't exist yet, return empty array
        if (error.code === 'PGRST116' || error.message?.includes('404')) {
          console.warn('Database tables not set up yet. Run migration first.');
          return [];
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
    mutationFn: (client: Omit<Client, "id" | "createdAt">) =>
      supabaseStorage.addClient(client, user!.id),
    onMutate: async (newClient) => {
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
    onSuccess: () => {
      toast.success("Client created");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", user?.id] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Client> }) =>
      supabaseStorage.updateClient(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update client");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supabaseStorage.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client deleted");
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
