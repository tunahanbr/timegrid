import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/db/client';
import { useToast } from '@/hooks/use-toast';

export interface Expense {
  id: string;
  user_id: string;
  project_id?: string;
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

  // Fetch expenses
  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ['expenses', projectId],
    queryFn: async () => {
      let query = supabase.from('expenses').select('*, projects(name)');
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query.order('expense_date', { ascending: false });

      if (error) throw error;
      return data as Expense[];
    },
  });

  // Create expense
  const createExpense = useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('expenses')
        .insert([{ ...expense, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as Expense;
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
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Expense;
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
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
