import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/init';

export interface Expense {
  id: string;
  user_id: string;
  project_id?: string | number;
  amount: number;
  currency: string;
  category: string;
  description?: string;
  receipt_url?: string;
  expense_date: string;
  is_billable: boolean;
  created_at: string;
  updated_at: string;
}

export function useExpenses(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getAuthHeaders } = useAuth();

  // Fetch expenses
  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ['expenses', projectId],
    queryFn: async () => {
      const url = new URL(`${getApiUrl()}/api/expenses`);
      if (projectId) {
        url.searchParams.set('project_id', projectId);
      }
      url.searchParams.set('order', 'expense_date:desc');
      
      const response = await fetch(url.toString(), {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load expenses');
      }
      // Convert amount from string to number (PostgreSQL NUMERIC returns as string)
      return (result.data || []).map((e: any) => ({
        ...e,
        amount: typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount,
      })) as Expense[];
    },
  });

  // Create expense
  const createExpense = useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const response = await fetch(`${getApiUrl()}/api/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(expense),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create expense');
      }
      return (result.data?.[0] || result.data) as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({
        title: 'Expense created',
        description: 'Expense has been recorded successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create expense',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update expense
  const updateExpense = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Expense> }) => {
      const response = await fetch(`${getApiUrl()}/api/expenses`, {
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
        throw new Error(result.error || 'Failed to update expense');
      }
      return (result.data?.[0] || result.data) as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({
        title: 'Expense updated',
        description: 'Expense has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update expense',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete expense
  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${getApiUrl()}/api/expenses`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete expense');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({
        title: 'Expense deleted',
        description: 'Expense has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete expense',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    expenses,
    isLoading,
    error,
    createExpense: createExpense.mutate,
    updateExpense: updateExpense.mutate,
    deleteExpense: deleteExpense.mutate,
    isCreating: createExpense.isPending,
    isUpdating: updateExpense.isPending,
    isDeleting: deleteExpense.isPending,
  };
}
