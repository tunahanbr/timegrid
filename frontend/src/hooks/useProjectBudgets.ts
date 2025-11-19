import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/init';

export interface ProjectBudget {
  id: string;
  project_id: string | number;
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
  const { getAuthHeaders } = useAuth();

  // Fetch budgets
  const { data: budgets = [], isLoading, error } = useQuery({
    queryKey: ['project-budgets', projectId],
    queryFn: async () => {
      const url = new URL(`${getApiUrl()}/api/project_budgets`);
      if (projectId) {
        url.searchParams.set('project_id', projectId);
      }
      url.searchParams.set('order', 'created_at:desc');
      
      const response = await fetch(url.toString(), {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load budgets');
      }
      // Convert numeric fields from string to number (PostgreSQL NUMERIC returns as string)
      return (result.data || []).map((b: any) => ({
        ...b,
        amount: typeof b.amount === 'string' ? parseFloat(b.amount) : b.amount,
        alert_threshold: typeof b.alert_threshold === 'string' ? parseFloat(b.alert_threshold) : b.alert_threshold,
      })) as ProjectBudget[];
    },
    enabled: !!projectId || projectId === undefined,
  });

  // Create budget
  const createBudget = useMutation({
    mutationFn: async (budget: Omit<ProjectBudget, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await fetch(`${getApiUrl()}/api/project_budgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(budget),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create budget');
      }
      return (result.data?.[0] || result.data) as ProjectBudget;
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
      const response = await fetch(`${getApiUrl()}/api/project_budgets`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          data: updates,
          filters: { id },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update budget');
      }
      return (result.data?.[0] || result.data) as ProjectBudget;
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
      const response = await fetch(`${getApiUrl()}/api/project_budgets`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete budget');
      }
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
