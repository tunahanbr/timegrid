import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseStorage, TimeEntry } from "@/lib/supabase-storage";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTimeEntries(filters?: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ["time-entries", user?.id, filters],
    queryFn: () => supabaseStorage.getEntries(filters),
    enabled: !!user,
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("time-entries-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_entries",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["time-entries"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const addMutation = useMutation({
    mutationFn: (entry: Omit<TimeEntry, "id" | "createdAt">) =>
      supabaseStorage.addEntry(entry, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success("Entry added");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add entry");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TimeEntry> }) =>
      supabaseStorage.updateEntry(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success("Entry updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update entry");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supabaseStorage.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success("Entry deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete entry");
    },
  });

  return {
    entries,
    isLoading,
    error,
    addEntry: addMutation.mutate,
    updateEntry: updateMutation.mutate,
    deleteEntry: deleteMutation.mutate,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
