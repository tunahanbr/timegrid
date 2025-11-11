import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseStorage } from "@/lib/supabase-storage";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'project_manager' | 'user';
  created_at: string;
}

export function useTeam() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch team members with optimized caching
  const {
    data: members = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["team-members", user?.id],
    queryFn: async () => {
      try {
        return await supabaseStorage.getTeamMembers();
      } catch (error: any) {
        // If database doesn't exist yet, return empty array
        if (error.code === 'PGRST116' || error.message?.includes('404')) {
          console.warn('Database tables not set up yet. Run migration first.');
          return [];
        }
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: 1, // Only retry once
    retryDelay: 500, // Wait 500ms before retry
  });

  // Update user role with optimistic update
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'project_manager' | 'user' }) =>
      supabaseStorage.updateUserRole(userId, role),
    onMutate: async ({ userId, role }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["team-members", user?.id] });
      
      // Snapshot previous value
      const previousMembers = queryClient.getQueryData(["team-members", user?.id]);
      
      // Optimistically update
      queryClient.setQueryData(["team-members", user?.id], (old: TeamMember[] = []) => 
        old.map(member => 
          member.id === userId ? { ...member, role } : member
        )
      );
      
      return { previousMembers };
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousMembers) {
        queryClient.setQueryData(["team-members", user?.id], context.previousMembers);
      }
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Role updated",
        description: "Team member role has been updated successfully.",
      });
    },
    onSettled: () => {
      // Refetch to ensure we're in sync
      queryClient.invalidateQueries({ queryKey: ["team-members", user?.id] });
    },
  });

  // Invite team member
  const inviteMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: 'admin' | 'project_manager' | 'user' }) =>
      supabaseStorage.inviteTeamMember(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({
        title: "Invitation sent",
        description: "Team member invitation has been sent via email.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove team member
  const removeMutation = useMutation({
    mutationFn: (userId: string) => supabaseStorage.removeTeamMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({
        title: "Member removed",
        description: "Team member has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error removing member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create team
  const createTeamMutation = useMutation({
    mutationFn: (name: string) => supabaseStorage.createTeam(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({
        title: "Team created",
        description: "Your team has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating team",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    members,
    isLoading,
    error,
    updateRole: updateRoleMutation.mutate,
    inviteMember: inviteMutation.mutate,
    removeMember: removeMutation.mutate,
    createTeam: createTeamMutation.mutate,
    isUpdatingRole: updateRoleMutation.isPending,
    isInviting: inviteMutation.isPending,
    isRemoving: removeMutation.isPending,
    isCreatingTeam: createTeamMutation.isPending,
  };
}
