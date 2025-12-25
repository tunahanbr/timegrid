import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/db/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/useAuth';

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  user_id: string;
}

export function useTags() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all tags
  const { data: tags = [], isLoading, error } = useQuery({
    queryKey: ['tags', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('No user found. Please sign in.');
      }

      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })
        .execute();

      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Create tag mutation
  const createTag = useMutation({
    mutationFn: async (tag: { name: string; color: string }) => {
      if (!user?.id) {
        throw new Error('No user found. Please sign in.');
      }

      const { data, error } = await supabase
        .from('tags')
        .insert({ ...tag, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Tag;
    },
    onMutate: async (newTag) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['tags'] });

      // Snapshot previous value
      const previousTags = queryClient.getQueryData<Tag[]>(['tags']);

      // Optimistically update
      if (previousTags) {
        queryClient.setQueryData<Tag[]>(['tags'], [
          ...previousTags,
          {
            id: `temp-${Date.now()}`,
            ...newTag,
            created_at: new Date().toISOString(),
            user_id: 'temp',
          },
        ]);
      }

      return { previousTags };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousTags) {
        queryClient.setQueryData(['tags'], context.previousTags);
      }
      toast({
        title: 'Failed to create tag',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({
        title: 'Tag created',
        description: 'Your tag has been created successfully.',
      });
    },
  });

  // Update tag mutation
  const updateTag = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tag> }) => {
      const { data, error } = await supabase
        .from('tags')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      // Server returns array, get first item
      const updatedTag = Array.isArray(data) ? data[0] : data;
      return updatedTag as Tag;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['tags'] });
      const previousTags = queryClient.getQueryData<Tag[]>(['tags']);

      if (previousTags) {
        queryClient.setQueryData<Tag[]>(
          ['tags'],
          previousTags.map((tag) => (tag.id === id ? { ...tag, ...updates } : tag))
        );
      }

      return { previousTags };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousTags) {
        queryClient.setQueryData(['tags'], context.previousTags);
      }
      toast({
        title: 'Failed to update tag',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({
        title: 'Tag updated',
        description: 'Your tag has been updated successfully.',
      });
    },
  });

  // Delete tag mutation
  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tags'] });
      const previousTags = queryClient.getQueryData<Tag[]>(['tags']);

      if (previousTags) {
        queryClient.setQueryData<Tag[]>(
          ['tags'],
          previousTags.filter((tag) => tag.id !== id)
        );
      }

      return { previousTags };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousTags) {
        queryClient.setQueryData(['tags'], context.previousTags);
      }
      toast({
        title: 'Failed to delete tag',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({
        title: 'Tag deleted',
        description: 'Your tag has been deleted successfully.',
      });
    },
  });

  return {
    tags,
    isLoading,
    error,
    createTag: createTag.mutate,
    updateTag: updateTag.mutate,
    deleteTag: deleteTag.mutate,
    isCreating: createTag.isPending,
    isUpdating: updateTag.isPending,
    isDeleting: deleteTag.isPending,
  };
}
