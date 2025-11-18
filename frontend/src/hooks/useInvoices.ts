import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/db/client';
import { useToast } from '@/hooks/use-toast';

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export function useInvoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all invoices
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      // Get user from localStorage
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        throw new Error('No user found. Please sign in.');
      }
      const user = JSON.parse(storedUser);

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('issue_date', { ascending: false })
        .execute();

      if (error) throw error;
      return data as Invoice[];
    },
    staleTime: 30000,
  });

  // Create invoice mutation
  const createInvoice = useMutation({
    mutationFn: async (invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>) => {
      // Get user from localStorage
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        throw new Error('No user found. Please sign in.');
      }
      const user = JSON.parse(storedUser);

      const { data, error } = await supabase
        .from('invoices')
        .insert([{ ...invoice, user_id: user.id }]);

      if (error) throw error;
      
      // Server returns array, get first item
      const newInvoice = Array.isArray(data) ? data[0] : data;
      return newInvoice as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Invoice created',
        description: 'Your invoice has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update invoice mutation
  const updateInvoice = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Invoice> }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      // Server returns array, get first item
      const updatedInvoice = Array.isArray(data) ? data[0] : data;
      return updatedInvoice as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Invoice updated',
        description: 'Your invoice has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete invoice mutation
  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Invoice deleted',
        description: 'Your invoice has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    invoices,
    isLoading,
    error,
    createInvoice: createInvoice.mutate,
    updateInvoice: updateInvoice.mutate,
    deleteInvoice: deleteInvoice.mutate,
    isCreating: createInvoice.isPending,
    isUpdating: updateInvoice.isPending,
    isDeleting: deleteInvoice.isPending,
  };
}

// Hook for invoice items
export function useInvoiceItems(invoiceId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch items for an invoice
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['invoice-items', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true })
        .execute();

      if (error) throw error;
      return data as InvoiceItem[];
    },
    enabled: !!invoiceId,
    staleTime: 30000,
  });

  // Create invoice item
  const createItem = useMutation({
    mutationFn: async (item: Omit<InvoiceItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('invoice_items')
        .insert([item]);

      if (error) throw error;
      
      const newItem = Array.isArray(data) ? data[0] : data;
      return newItem as InvoiceItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-items', invoiceId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete invoice item
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invoice_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-items', invoiceId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    items,
    isLoading,
    error,
    createItem: createItem.mutate,
    deleteItem: deleteItem.mutate,
    isCreating: createItem.isPending,
    isDeleting: deleteItem.isPending,
  };
}
