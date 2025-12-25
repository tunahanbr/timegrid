/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/useAuth';
import { getApiUrl } from '@/lib/init';

export interface APIKey {
  id: string;
  key_id: string;
  name: string | null;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export interface CreatedAPIKey {
  keyId: string;
  name: string | null;
  apiKey: string; // Full value returned only at creation
}

export function useAPIKeys() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getAuthHeaders } = useAuth();

  // Fetch all API keys
  const { data: apiKeys = [], isLoading, error } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: async () => {
      const response = await fetch(`${getApiUrl()}/api/auth/api-keys`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to load API keys');
      }
      const keys = (data.keys || []) as any[];
      return keys.map((k) => ({
        id: String(k.id),
        key_id: String(k.key_id),
        name: k.name ?? null,
        created_at: k.created_at,
        last_used_at: k.last_used_at ?? null,
        is_active: !k.revoked_at,
      })) as APIKey[];
    },
    staleTime: 30000,
  });

  // Create API key
  const createAPIKey = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`${getApiUrl()}/api/auth/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create API key');
      }
      return {
        keyId: data.keyId,
        name: data.name ?? null,
        apiKey: data.apiKey,
      } as CreatedAPIKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast({
        title: 'API Key created',
        description: 'Your new API key has been generated. Copy it now; it won’t be shown again.',
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
    mutationFn: async ({ keyId, active }: { keyId: string; active: boolean }) => {
      const response = await fetch(`${getApiUrl()}/api/auth/api-keys/${keyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ active }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to update API key');
      }
      const k = data.key;
      const updated: APIKey = {
        id: String(k.id),
        key_id: String(k.key_id),
        name: k.name ?? null,
        created_at: k.created_at,
        last_used_at: k.last_used_at ?? null,
        is_active: !k.revoked_at,
      };
      return updated;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast({
        title: variables.active ? 'API Key activated' : 'API Key deactivated',
        description: `The API key has been ${variables.active ? 'activated' : 'deactivated'}.`,
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
    mutationFn: async (keyId: string) => {
      const response = await fetch(`${getApiUrl()}/api/auth/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to delete API key');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast({
        title: 'API Key deleted',
        description: 'The API key has been revoked.',
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
    createAPIKeyAsync: createAPIKey.mutateAsync,
    toggleAPIKey: toggleAPIKey.mutate,
    deleteAPIKey: deleteAPIKey.mutate,
    isCreating: createAPIKey.isPending,
    isToggling: toggleAPIKey.isPending,
    isDeleting: deleteAPIKey.isPending,
  };
}
