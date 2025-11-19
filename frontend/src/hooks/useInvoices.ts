import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/init';

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
  const { getAuthHeaders } = useAuth();

  // Fetch all invoices
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const response = await fetch(`${getApiUrl()}/api/invoices`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load invoices');
      }
      // Convert numeric fields from string to number (PostgreSQL NUMERIC returns as string)
      return (result.data || []).map((inv: any) => ({
        ...inv,
        subtotal: typeof inv.subtotal === 'string' ? parseFloat(inv.subtotal) : (inv.subtotal || 0),
        tax_rate: typeof inv.tax_rate === 'string' ? parseFloat(inv.tax_rate) : (inv.tax_rate || 0),
        tax_amount: typeof inv.tax_amount === 'string' ? parseFloat(inv.tax_amount) : (inv.tax_amount || 0),
        total: typeof inv.total === 'string' ? parseFloat(inv.total) : (inv.total || 0),
        amount: typeof inv.amount === 'string' ? parseFloat(inv.amount) : (inv.amount || inv.total || 0),
      })) as Invoice[];
    },
    staleTime: 30000,
  });

  // Create invoice mutation
  const createInvoice = useMutation({
    mutationFn: async (invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await fetch(`${getApiUrl()}/api/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(invoice),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create invoice');
      }
      return (result.data?.[0] || result.data) as Invoice;
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
      const response = await fetch(`${getApiUrl()}/api/invoices`, {
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
        throw new Error(result.error || 'Failed to update invoice');
      }
      return (result.data?.[0] || result.data) as Invoice;
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
      const response = await fetch(`${getApiUrl()}/api/invoices`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete invoice');
      }
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
  const { getAuthHeaders } = useAuth();

  // Fetch items for an invoice
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['invoice-items', invoiceId],
    queryFn: async () => {
      const response = await fetch(`${getApiUrl()}/api/invoice_items?invoice_id=${invoiceId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load invoice items');
      }
      return (result.data || []) as InvoiceItem[];
    },
    enabled: !!invoiceId,
    staleTime: 30000,
  });

  // Create invoice item
  const createItem = useMutation({
    mutationFn: async (item: Omit<InvoiceItem, 'id' | 'created_at'>) => {
      const response = await fetch(`${getApiUrl()}/api/invoice_items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(item),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create invoice item');
      }
      return (result.data?.[0] || result.data) as InvoiceItem;
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
      const response = await fetch(`${getApiUrl()}/api/invoice_items`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete invoice item');
      }
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
