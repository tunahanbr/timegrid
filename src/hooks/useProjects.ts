import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseStorage, Project } from "@/lib/supabase-storage";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: () => supabaseStorage.getProjects(),
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: (project: Omit<Project, "id" | "createdAt">) =>
      supabaseStorage.addProject(project, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create project");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Project> }) =>
      supabaseStorage.updateProject(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update project");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supabaseStorage.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project archived");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to archive project");
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
