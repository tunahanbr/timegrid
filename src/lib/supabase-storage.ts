import { supabase } from "@/integrations/supabase/client";

export interface TimeEntry {
  id: string;
  projectId: string;
  description: string;
  tags: string[];
  duration: number;
  date: string;
  createdAt: string;
  userId?: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  hourlyRate?: number;
  clientId?: string;
  createdAt: string;
  isSolo?: boolean;
  memberCount?: number;
  userRole?: 'admin' | 'project_manager' | 'user';
  canEdit?: boolean;
  canViewAllEntries?: boolean;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'admin' | 'project_manager' | 'user';
  canEdit: boolean;
  canViewAllEntries: boolean;
  joinedAt: string;
  user?: {
    email: string;
    fullName: string;
  };
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  email: string;
  role: 'admin' | 'project_manager' | 'user';
  token: string;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
}

export interface UserSettings {
  features: {
    clients: boolean;
    invoicing: boolean;
    projects: boolean;
    tags: boolean;
    reports: boolean;
    collaboration: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    defaultView: 'timer' | 'entries' | 'projects';
    weekStart: 'monday' | 'sunday';
  };
  onboardingCompleted: boolean;
  userMode: 'personal' | 'freelancer' | 'team';
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
  address?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
}

export const supabaseStorage = {
  // Projects
  async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      hourlyRate: p.hourly_rate,
      clientId: p.client_id,
      createdAt: p.created_at,
    }));
  },

  async addProject(project: Omit<Project, "id" | "createdAt">, userId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: project.name,
        color: project.color,
        hourly_rate: project.hourlyRate || 0,
        client_id: project.clientId,
        created_by: user?.id || userId,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProject(id: string, updates: Partial<Project>) {
    const { error } = await supabase
      .from("projects")
      .update({
        name: updates.name,
        color: updates.color,
        hourly_rate: updates.hourlyRate,
        client_id: updates.clientId,
      })
      .eq("id", id);
    
    if (error) throw error;
  },

  async deleteProject(id: string) {
    const { error } = await supabase
      .from("projects")
      .update({ is_archived: true })
      .eq("id", id);
    
    if (error) throw error;
  },

  // Time Entries
  async getEntries(filters?: any): Promise<TimeEntry[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from("time_entries")
      .select(`
        *,
        entry_tags(
          tags(name)
        )
      `)
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (filters?.dateFrom) query = query.gte("date", filters.dateFrom);
    if (filters?.dateTo) query = query.lte("date", filters.dateTo);
    if (filters?.projectIds?.length) query = query.in("project_id", filters.projectIds);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(e => ({
      id: e.id,
      projectId: e.project_id,
      description: e.description || "",
      duration: e.duration,
      date: e.date,
      tags: e.entry_tags?.map((et: any) => et.tags?.name).filter(Boolean) || [],
      createdAt: e.created_at,
      userId: e.user_id,
    }));
  },

  async addEntry(entry: Omit<TimeEntry, "id" | "createdAt">, userId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        user_id: user?.id || userId,
        project_id: entry.projectId,
        description: entry.description,
        duration: entry.duration,
        date: entry.date,
      })
      .select()
      .single();

    if (error) throw error;

    // Add tags
    if (entry.tags.length > 0 && data) {
      for (const tagName of entry.tags) {
        let { data: tag } = await supabase
          .from("tags")
          .select()
          .eq("name", tagName)
          .maybeSingle();

        if (!tag) {
          const { data: newTag } = await supabase
            .from("tags")
            .insert({ name: tagName, created_by: user?.id || userId })
            .select()
            .single();
          tag = newTag;
        }

        if (tag) {
          await supabase.from("entry_tags").insert({
            entry_id: data.id,
            tag_id: tag.id,
          });
        }
      }
    }

    return data;
  },

  async updateEntry(id: string, updates: Partial<TimeEntry>) {
    const { error } = await supabase
      .from("time_entries")
      .update({
        description: updates.description,
        duration: updates.duration,
        project_id: updates.projectId,
      })
      .eq("id", id);
    
    if (error) throw error;
  },

  async deleteEntry(id: string) {
    const { error } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  },

  // Tags
  async getTags(): Promise<Tag[]> {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name");
    
    if (error) throw error;
    
    return (data || []).map(t => ({
      id: t.id,
      name: t.name,
      createdAt: t.created_at,
    }));
  },

  // Clients
  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");
    
    if (error) throw error;
    
    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      company: c.company,
      address: c.address,
      phone: c.phone,
      notes: c.notes,
      createdAt: c.created_at,
    }));
  },

  async addClient(client: Omit<Client, "id" | "createdAt">, userId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: client.name,
        email: client.email,
        company: client.company,
        address: client.address,
        phone: client.phone,
        notes: client.notes,
        created_by: user?.id || userId,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateClient(id: string, updates: Partial<Client>) {
    const { error } = await supabase
      .from("clients")
      .update({
        name: updates.name,
        email: updates.email,
        company: updates.company,
        address: updates.address,
        phone: updates.phone,
        notes: updates.notes,
      })
      .eq("id", id);
    
    if (error) throw error;
  },

  async deleteClient(id: string) {
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  },

  // Team Management
  async getTeamMembers(): Promise<any[]> {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    // Optimized: Get current user with their team members in a single query
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, team_id")
      .eq("id", currentUser.user.id)
      .single();

    if (userError) throw userError;
    if (!userData?.team_id) return []; // No team yet

    // Get all team members (optimized single query)
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, role, created_at")
      .eq("team_id", userData.team_id)
      .order("created_at", { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async updateUserRole(userId: string, newRole: 'admin' | 'project_manager' | 'user') {
    const { error } = await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", userId);
    
    if (error) throw error;
  },

  async inviteTeamMember(email: string, role: 'admin' | 'project_manager' | 'user') {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    // Get current user's team_id and role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("team_id, role")
      .eq("id", currentUser.user.id)
      .single();

    if (userError) throw userError;
    if (!userData?.team_id) throw new Error("User not in a team");
    
    // Only admins can invite
    if (userData.role !== 'admin') {
      throw new Error("Only admins can invite team members");
    }

    // Use Supabase Admin API to invite user
    // Note: This requires the admin email invite URL to be configured in Supabase
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        team_id: userData.team_id,
        role: role,
      },
    });

    if (error) throw error;
    return data;
  },

  async removeTeamMember(userId: string) {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    // Get current user's role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", currentUser.user.id)
      .single();

    if (userError) throw userError;
    
    // Only admins can remove members
    if (userData?.role !== 'admin') {
      throw new Error("Only admins can remove team members");
    }

    // Remove user from team (set team_id to null)
    const { error } = await supabase
      .from("users")
      .update({ team_id: null })
      .eq("id", userId);
    
    if (error) throw error;
  },

  async createTeam(name: string): Promise<any> {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    // Create team
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name,
        created_by: currentUser.user.id,
      })
      .select()
      .single();

    if (teamError) throw teamError;

    // Update user's team_id and role to admin
    const { error: userError } = await supabase
      .from("users")
      .update({ 
        team_id: team.id,
        role: 'admin'
      })
      .eq("id", currentUser.user.id);

    if (userError) throw userError;

    return team;
  },

  // User Settings
  async getUserSettings(): Promise<UserSettings | null> {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("users")
      .select("settings")
      .eq("id", currentUser.user.id)
      .single();

    if (error) throw error;
    return data?.settings as UserSettings || null;
  },

  async updateUserSettings(settings: Partial<UserSettings>): Promise<void> {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    // Get current settings
    const current = await this.getUserSettings();
    const merged = {
      ...current,
      ...settings,
      features: { ...current?.features, ...settings.features },
      preferences: { ...current?.preferences, ...settings.preferences },
    };

    const { error } = await supabase
      .from("users")
      .update({ settings: merged })
      .eq("id", currentUser.user.id);

    if (error) throw error;
  },

  // Project Members
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const { data, error } = await supabase
      .from("project_members")
      .select(`
        *,
        users:user_id (
          email,
          full_name
        )
      `)
      .eq("project_id", projectId)
      .order("joined_at", { ascending: true });

    if (error) throw error;

    return (data || []).map((m: any) => ({
      id: m.id,
      projectId: m.project_id,
      userId: m.user_id,
      role: m.role,
      canEdit: m.can_edit,
      canViewAllEntries: m.can_view_all_entries,
      joinedAt: m.joined_at,
      user: m.users ? {
        email: m.users.email,
        fullName: m.users.full_name,
      } : undefined,
    }));
  },

  async addProjectMember(
    projectId: string,
    userId: string,
    role: 'admin' | 'project_manager' | 'user',
    canEdit: boolean = true,
    canViewAllEntries: boolean = false
  ): Promise<ProjectMember> {
    const { data, error } = await supabase
      .from("project_members")
      .insert({
        project_id: projectId,
        user_id: userId,
        role,
        can_edit: canEdit,
        can_view_all_entries: canViewAllEntries,
      })
      .select()
      .single();

    if (error) throw error;
    return data as any;
  },

  async updateProjectMember(
    id: string,
    updates: {
      role?: 'admin' | 'project_manager' | 'user';
      canEdit?: boolean;
      canViewAllEntries?: boolean;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from("project_members")
      .update({
        role: updates.role,
        can_edit: updates.canEdit,
        can_view_all_entries: updates.canViewAllEntries,
      })
      .eq("id", id);

    if (error) throw error;
  },

  async removeProjectMember(id: string): Promise<void> {
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Project Invitations
  async getProjectInvitations(projectId: string): Promise<ProjectInvitation[]> {
    const { data, error } = await supabase
      .from("project_invitations")
      .select("*")
      .eq("project_id", projectId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((i: any) => ({
      id: i.id,
      projectId: i.project_id,
      email: i.email,
      role: i.role,
      token: i.token,
      invitedBy: i.invited_by,
      expiresAt: i.expires_at,
      createdAt: i.created_at,
      acceptedAt: i.accepted_at,
    }));
  },

  async inviteToProject(
    projectId: string,
    email: string,
    role: 'admin' | 'project_manager' | 'user'
  ): Promise<ProjectInvitation> {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("project_invitations")
      .insert({
        project_id: projectId,
        email,
        role,
        invited_by: currentUser.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: Send invitation email via Edge Function
    // For now, just return the invitation data
    return data as any;
  },

  async acceptProjectInvitation(token: string): Promise<void> {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    // Get invitation
    const { data: invitation, error: invError } = await supabase
      .from("project_invitations")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (invError) throw new Error("Invalid or expired invitation");

    // Check if user's email matches
    if (invitation.email !== currentUser.user.email) {
      throw new Error("This invitation is for a different email address");
    }

    // Add user to project
    await this.addProjectMember(
      invitation.project_id,
      currentUser.user.id,
      invitation.role,
      invitation.role !== 'user',
      invitation.role === 'admin' || invitation.role === 'project_manager'
    );

    // Mark invitation as accepted
    const { error } = await supabase
      .from("project_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (error) throw error;
  },

  async deleteProjectInvitation(id: string): Promise<void> {
    const { error } = await supabase
      .from("project_invitations")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};
