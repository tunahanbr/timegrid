/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/useAuth';
import { getApiUrl } from '@/lib/init';

export interface Calendar {
  id: string;
  name: string;
  color: string;
}

export function useCalendars() {
  const { user, getAuthHeaders } = useAuth();
  const api = getApiUrl();
  const queryClient = useQueryClient();

  const { data: calendars = [], isLoading, error } = useQuery({
    queryKey: ['calendars', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch(`${api}/api/calendars`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load calendars');
      const data = await res.json();
      return (data?.data || []).map((c: any) => ({ id: c.id, name: c.name, color: c.color }));
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const res = await fetch(`${api}/api/calendars`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) throw new Error('Failed to create calendar');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendars', user?.id] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const res = await fetch(`${api}/api/calendars`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ id, name, color }),
      });
      if (!res.ok) throw new Error('Failed to update calendar');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendars', user?.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${api}/api/calendars`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete calendar');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendars', user?.id] }),
  });

  return {
    calendars,
    isLoading,
    error,
    addCalendar: addMutation.mutate,
    addCalendarAsync: addMutation.mutateAsync,
    updateCalendar: updateMutation.mutate,
    updateCalendarAsync: updateMutation.mutateAsync,
    deleteCalendar: deleteMutation.mutate,
    deleteCalendarAsync: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
