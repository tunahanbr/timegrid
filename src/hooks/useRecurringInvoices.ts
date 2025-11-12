import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/db/client';
import { useToast } from '@/hooks/use-toast';

export interface RecurringInvoice {
  id: string;
  user_id: string;
  client_id: string;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_run_date: string;
  last_run_date?: string;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export function useRecurringInvoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch recurring invoices
  const { data: recurringInvoices = [], isLoading, error } = useQuery({
    queryKey: ['recurring-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_invoices')
        .select('*, clients(name)')
        .order('next_run_date', { ascending: true });

      if (error) throw error;
      return data as RecurringInvoice[];
    },
  });

  // Create recurring invoice
  const createRecurringInvoice = useMutation({
    mutationFn: async (invoice: Omit<RecurringInvoice, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('recurring_invoices')
        .insert([{ ...invoice, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as RecurringInvoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] });
      toast({
        title: 'Recurring invoice created',
        description: 'Recurring invoice has been set up successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create recurring invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update recurring invoice
  const updateRecurringInvoice = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RecurringInvoice> }) => {
      const { data, error } = await supabase
        .from('recurring_invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RecurringInvoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] });
      toast({
        title: 'Recurring invoice updated',
        description: 'Recurring invoice has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update recurring invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete recurring invoice
  const deleteRecurringInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] });
      toast({
        title: 'Recurring invoice deleted',
        description: 'Recurring invoice has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete recurring invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Toggle active status
  const toggleRecurringInvoice = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('recurring_invoices')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RecurringInvoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] });
      toast({
        title: data.is_active ? 'Recurring invoice activated' : 'Recurring invoice paused',
        description: data.is_active 
          ? 'Invoices will be generated automatically.' 
          : 'Invoice generation has been paused.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to toggle recurring invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    recurringInvoices,
    isLoading,
    error,
    createRecurringInvoice: createRecurringInvoice.mutate,
    updateRecurringInvoice: updateRecurringInvoice.mutate,
    deleteRecurringInvoice: deleteRecurringInvoice.mutate,
    toggleRecurringInvoice: toggleRecurringInvoice.mutate,
    isCreating: createRecurringInvoice.isPending,
    isUpdating: updateRecurringInvoice.isPending,
    isDeleting: deleteRecurringInvoice.isPending,
    isToggling: toggleRecurringInvoice.isPending,
  };
}
