import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/init';

export interface RecurringInvoice {
  id: string;
  user_id: string;
  client_id: string | number;
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
  const { getAuthHeaders } = useAuth();

  // Fetch recurring invoices
  const { data: recurringInvoices = [], isLoading, error } = useQuery({
    queryKey: ['recurring-invoices'],
    queryFn: async () => {
      const response = await fetch(`${getApiUrl()}/api/recurring_invoices?order=next_run_date:asc`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load recurring invoices');
      }
      return (result.data || []) as RecurringInvoice[];
    },
  });

  // Create recurring invoice
  const createRecurringInvoice = useMutation({
    mutationFn: async (invoice: Omit<RecurringInvoice, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const response = await fetch(`${getApiUrl()}/api/recurring_invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(invoice),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create recurring invoice');
      }
      return (result.data?.[0] || result.data) as RecurringInvoice;
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
      const response = await fetch(`${getApiUrl()}/api/recurring_invoices`, {
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
        throw new Error(result.error || 'Failed to update recurring invoice');
      }
      return (result.data?.[0] || result.data) as RecurringInvoice;
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
      const response = await fetch(`${getApiUrl()}/api/recurring_invoices`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete recurring invoice');
      }
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
      const response = await fetch(`${getApiUrl()}/api/recurring_invoices`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          data: { is_active },
          filters: { id },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to toggle recurring invoice');
      }
      return (result.data?.[0] || result.data) as RecurringInvoice;
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
