import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/db/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectBudget {
  id: string;
  project_id: string;
  amount: number;
  currency: string;
  period: 'monthly' | 'quarterly' | 'yearly' | 'total';
  start_date?: string;
  end_date?: string;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
}

export function useProjectBudgets(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch budgets
  const { data: budgets = [], isLoading, error } = useQuery({
    queryKey: ['project-budgets', projectId],
    queryFn: async () => {
      let query = supabase.from('project_budgets').select('*');
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectBudget[];
    },
    enabled: !!projectId || projectId === undefined,
  });

  // Create budget
  const createBudget = useMutation({
    mutationFn: async (budget: Omit<ProjectBudget, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('project_budgets')
        .insert([budget])
        .select()
        .single();

      if (error) throw error;
      return data as ProjectBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast({
        title: 'Budget created',
        description: 'Project budget has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create budget',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update budget
  const updateBudget = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProjectBudget> }) => {
      const { data, error } = await supabase
        .from('project_budgets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ProjectBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast({
        title: 'Budget updated',
        description: 'Project budget has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update budget',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete budget
  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast({
        title: 'Budget deleted',
        description: 'Project budget has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete budget',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    budgets,
    isLoading,
    error,
    createBudget: createBudget.mutate,
    updateBudget: updateBudget.mutate,
    deleteBudget: deleteBudget.mutate,
    isCreating: createBudget.isPending,
    isUpdating: updateBudget.isPending,
    isDeleting: deleteBudget.isPending,
  };
}
