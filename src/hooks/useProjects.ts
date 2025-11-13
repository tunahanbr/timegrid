import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseStorage, Project } from "@/lib/supabase-storage";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { offlineSync } from "@/lib/offline-sync";
import { offlineStorage } from "@/lib/offline-storage";

export function useProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const onlineProjects = await supabaseStorage.getProjects();
      const offlineProjects = offlineStorage.getOfflineProjects();
      
      // Merge online and offline projects
      // Offline projects appear first (with isOffline flag)
      return [...offlineProjects, ...onlineProjects] as Project[];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async (project: Omit<Project, "id" | "createdAt">) => {
      if (!navigator.onLine) {
        // Queue operation when offline
        const queueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await offlineSync.queueOperation({
          type: 'create',
          entity: 'project',
          data: {
            ...project,
            userId: user!.id,
          },
        });
        
        // Store offline for immediate UI update
        const offlineProject = offlineStorage.addOfflineProject(project, queueId);
        toast.info("Project saved offline");
        return offlineProject;
      }
      return supabaseStorage.addProject(project, user!.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.refetchQueries({ queryKey: ["projects"] });
      if (data && 'isOffline' in data) {
        // Offline project added
      } else if (data !== null) {
        toast.success("Project created");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create project");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      if (!navigator.onLine) {
        // Queue operation when offline
        await offlineSync.queueOperation({
          type: 'update',
          entity: 'project',
          data: { id, updates },
        });
        toast.info("Update queued (offline)");
        return;
      }
      return supabaseStorage.updateProject(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (navigator.onLine) {
        toast.success("Project updated");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update project");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) {
        // Queue operation when offline
        await offlineSync.queueOperation({
          type: 'delete',
          entity: 'project',
          data: { id },
        });
        toast.info("Delete queued (offline)");
        return;
      }
      return supabaseStorage.deleteProject(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (navigator.onLine) {
        toast.success("Project deleted");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete project");
    },
  });

  return {
    projects,
    isLoading,
    error,
    addProject: addMutation.mutate,
    updateProject: updateMutation.mutate,
    deleteProject: deleteMutation.mutate,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
