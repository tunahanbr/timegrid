/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseStorage, UserSettings } from "@/lib/supabase-storage";
import { useAuth } from "@/contexts/useAuth";
import { toast } from "sonner";

const defaultSettings: UserSettings = {
  features: {
    clients: true,
    invoicing: true,
    projects: true,
    tags: true,
    reports: true,
    collaboration: false,
    budgets: true,
    expenses: true,
    apiKeys: false,
    import: false,
    integrations: false,
  },
  preferences: {
    theme: 'dark',
    defaultView: 'timer',
    weekStart: 'monday',
    timeFormat: '12h', // 12h or 24h
  },
  onboardingCompleted: false,
  userMode: 'freelancer',
};

export function useUserSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings = defaultSettings, isLoading, error } = useQuery({
    queryKey: ["user-settings", user?.id],
    queryFn: async () => {
      const data = await supabaseStorage.getUserSettings();
      return data || defaultSettings;
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: (newSettings: Partial<UserSettings>) =>
      supabaseStorage.updateUserSettings(newSettings),
    onMutate: async (newSettings) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["user-settings"] });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData(["user-settings", user?.id]);

      // Optimistically update to the new value
      queryClient.setQueryData(["user-settings", user?.id], (old: UserSettings | undefined) => ({
        ...defaultSettings,
        ...old,
        ...newSettings,
        features: { ...old?.features, ...newSettings.features },
        preferences: { ...old?.preferences, ...newSettings.preferences },
      }));

      // Return a context with the snapshot
      return { previousSettings };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      toast.success("Settings saved successfully");
    },
    onError: (error: any, _newSettings, context) => {
      // Rollback to the previous value on error
      if (context?.previousSettings) {
        queryClient.setQueryData(["user-settings", user?.id], context.previousSettings);
      }
      toast.error(error.message || "Failed to save settings");
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
