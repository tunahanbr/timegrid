/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseStorage, Project } from "@/lib/supabase-storage";
import { useAuth } from "@/contexts/useAuth";
import { toast } from "sonner";
import { offlineSync } from "@/lib/offline-sync";
import { offlineStorage } from "@/lib/offline-storage";
import { logger } from "@/lib/logger";

export function useProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      logger.queryStart('projects');
      try {
        const offlineProjects = await offlineStorage.getOfflineProjects();
        const onlineProjects = await supabaseStorage.getProjects();
        
        // Cache the online data for offline use
        await offlineStorage.setCachedProjects(onlineProjects);
        
        logger.querySuccess('projects', offlineProjects.length + onlineProjects.length);
        return [...offlineProjects, ...onlineProjects] as Project[];
      } catch (error) {
        logger.queryError('projects', error);
        
        // On error, use cached online data + offline data
        const offlineProjects = await offlineStorage.getOfflineProjects();
        const cachedProjects = await offlineStorage.getCachedProjects();
        
        return [...offlineProjects, ...cachedProjects] as Project[];
      }
    },
    enabled: !!user,
    staleTime: 30000, // Consider data fresh for 30 seconds
    retry: false, // Don't retry on failure when offline
  });

  const addMutation = useMutation({
    mutationFn: async (project: Omit<Project, "id" | "createdAt">) => {
      logger.mutationStart('add', 'project');
      
      try {
        if (!navigator.onLine) {
          // Queue operation when offline
          const queueId = offlineSync.queueOperation({
            type: 'create',
            entity: 'project',
            data: {
              ...project,
              userId: user!.id,
            },
          });
          
          console.log('[useProjects] Queued with ID:', queueId);
          
          // Store offline for immediate UI update
          const offlineProject = await offlineStorage.addOfflineProject(project, queueId);
          console.log('[useProjects] Stored offline project:', offlineProject);
          
          toast.info("Project saved offline");
          return offlineProject;
        }
        return supabaseStorage.addProject(project, user!.id);
      } catch (error) {
        console.error('[useProjects] Error adding project:', error);
        throw error;
      }
    },
    onMutate: (variables) => {
      console.log('[useProjects] onMutate called with:', variables);
    },
    onSuccess: async (data) => {
      console.log('[useProjects] Project added successfully:', data);
      console.log('[useProjects] Current user?.id:', user?.id);
      
      if (data && 'isOffline' in data) {
        // Offline project added - invalidate to refetch from offline storage
        const queryKey = ["projects", user?.id];
        console.log('[useProjects] Invalidating query with key:', queryKey);
        
        // Invalidate and refetch - this will run the queryFn which now includes offline data
        queryClient.invalidateQueries({ queryKey });
        
        try {
          await queryClient.refetchQueries({ queryKey });
          console.log('[useProjects] Refetch completed successfully');
        } catch (error) {
          console.error('[useProjects] Refetch error (expected when offline):', error);
          // This is expected when offline - the query will use cached data
        }
      } else {
        // Online project added - refetch to get fresh data
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.refetchQueries({ queryKey: ["projects"] });
        if (data !== null) {
          toast.success("Project created");
        }
      }
    },
    onError: (error: any) => {
      console.error('[useProjects] Mutation error:', error);
      toast.error(error.message || "Failed to create project");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      if (!navigator.onLine) {
        // Queue operation when offline
        offlineSync.queueOperation({
          type: 'update',
          entity: 'project',
          data: { id, updates },
        });
        
        // Update cached project locally for immediate UI feedback
        const cachedProjects = await offlineStorage.getCachedProjects();
        const updatedCache = cachedProjects.map(p => 
          p.id === id ? { ...p, ...updates } : p
        );
        await offlineStorage.setCachedProjects(updatedCache);
        
        toast.info("Update queued (offline)");
        return { id, updates };
      }
      return supabaseStorage.updateProject(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.refetchQueries({ queryKey: ["projects"] });
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
        offlineSync.queueOperation({
          type: 'delete',
          entity: 'project',
          data: { id },
        });
        
        // Remove from cached projects locally for immediate UI feedback
        const cachedProjects = await offlineStorage.getCachedProjects();
        const updatedCache = cachedProjects.filter(p => p.id !== id);
        await offlineStorage.setCachedProjects(updatedCache);
        
        // Also remove from offline projects if it exists there
        const offlineProjects = await offlineStorage.getOfflineProjects();
        const offlineProject = offlineProjects.find(p => p.id === id);
        if (offlineProject?.queueId) {
          await offlineStorage.removeOfflineProject(offlineProject.queueId);
        }
        
        toast.info("Delete queued (offline)");
        return;
      }
      return supabaseStorage.deleteProject(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.refetchQueries({ queryKey: ["projects"] });
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
