import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/db/client';
import { useToast } from '@/hooks/use-toast';

export interface APIKey {
  id: string;
  user_id: string;
  name: string;
  key: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export function useAPIKeys() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all API keys
  const { data: apiKeys = [], isLoading, error } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: async () => {
      // Get user from localStorage
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        throw new Error('No user found. Please sign in.');
      }
      const user = JSON.parse(storedUser);

      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .execute();

      if (error) throw error;
      return data as APIKey[];
    },
    staleTime: 30000,
  });

  // Create API key
  const createAPIKey = useMutation({
    mutationFn: async (name: string) => {
      // Get user from localStorage
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        throw new Error('No user found. Please sign in.');
      }
      const user = JSON.parse(storedUser);

      // Generate a random API key
      const key = `tk_${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`;

      const { data, error } = await supabase
        .from('api_keys')
        .insert([{
          user_id: user.id,
          name,
          key,
          is_active: true,
        }]);

      if (error) throw error;
      
      const newKey = Array.isArray(data) ? data[0] : data;
      return newKey as APIKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast({
        title: 'API Key created',
        description: 'Your new API key has been generated. Make sure to copy it now!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create API key',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Toggle API key active status
  const toggleAPIKey = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('api_keys')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
      
      const updatedKey = Array.isArray(data) ? data[0] : data;
      return updatedKey as APIKey;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast({
        title: variables.is_active ? 'API Key activated' : 'API Key deactivated',
        description: `The API key has been ${variables.is_active ? 'activated' : 'deactivated'}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update API key',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete API key
  const deleteAPIKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast({
        title: 'API Key deleted',
        description: 'The API key has been permanently deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete API key',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    apiKeys,
    isLoading,
    error,
    createAPIKey: createAPIKey.mutate,
    toggleAPIKey: toggleAPIKey.mutate,
    deleteAPIKey: deleteAPIKey.mutate,
    isCreating: createAPIKey.isPending,
    isToggling: toggleAPIKey.isPending,
    isDeleting: deleteAPIKey.isPending,
  };
}
