import { supabase } from "@/integrations/db/client";

export interface TimeEntry {
  id: string;
  projectId: string;
  calendarId?: string | null;
  description: string;
  tags: string[];
  duration: number;
  date: string;
  startTime?: string; // ISO datetime
  endTime?: string; // ISO datetime
  createdAt: string;
  userId?: string;
  isBillable?: boolean;
  isRecurring?: boolean;
  recurrenceRule?: string; // RFC 5545 RRULE format
  parentEntryId?: string;
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
    budgets: boolean;
    expenses: boolean;
    apiKeys: boolean;
    import: boolean;
    integrations: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    defaultView: 'timer' | 'entries' | 'projects';
    weekStart: 'monday' | 'sunday';
    timeFormat: '12h' | '24h';
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
      .order("created_at", { ascending: false })
      .execute();
    
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
    const response = await supabase
      .from("projects")
      .insert({
        name: project.name,
        color: project.color,
        hourly_rate: project.hourlyRate || 0,
        client_id: project.clientId,
        user_id: userId,
      });
    
    if (response.error) throw new Error(response.error.message);
    
    // Return the first item from the data array
    return response.data?.[0] || response.data;
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
    console.log('[deleteProject] Starting delete for project ID:', id);
    
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);
    
    console.log('[deleteProject] Delete result - error:', error);
    
    if (error) throw error;
    
    console.log('[deleteProject] Successfully deleted project');
  },

  // Time Entries
  async getEntries(filters?: any, userId?: string): Promise<TimeEntry[]> {
    // userId should be provided by the hook, but if not, we can't proceed
    if (!userId) {
      console.warn('[getEntries] No userId provided, returning empty array');
      return [];
    }

    console.log('[getEntries] Fetching entries for user:', userId);

    let query = supabase
      .from("time_entries")
      .select("*")  // Simplified - no nested joins for now
      .eq("user_id", userId)
      .order("start_time", { ascending: false });

    // Note: Date filtering would need server-side support for gte/lte operators
    // For now, we'll fetch all entries and could filter client-side if needed

    console.log('[getEntries] Executing query...');
    const result = await query;
    console.log('[getEntries] Query result:', result);
    
    const { data, error } = result;
    
    if (error) {
      console.error('[getEntries] Query error:', error);
      throw error;
    }

    console.log('[getEntries] Raw data from database:', data);
    console.log('[getEntries] Number of entries:', data?.length || 0);

    // Return early if no entries
    if (!data || data.length === 0) {
      console.log('[getEntries] No entries found, returning empty array');
      return [];
    }

    // Batch fetch all tags for all entries (optimized - single query)
    const entryIds = data.map((e: any) => e.id);
    
    // Fetch all time_entry_tags relationships in one query
    const entryTagsResponse = await supabase
      .from("time_entry_tags")
      .select("time_entry_id, tag_id")
      .in("time_entry_id", entryIds);

    // Get all unique tag IDs
    const allTagIds = [...new Set((entryTagsResponse.data || []).map((et: any) => et.tag_id))];
    
    // Fetch all tags in one query
    let tagsMap = new Map<string, string>();
    if (allTagIds.length > 0) {
      const tagsResponse = await supabase
        .from("tags")
        .select("id, name")
        .in("id", allTagIds);
      
      (tagsResponse.data || []).forEach((tag: any) => {
        tagsMap.set(tag.id, tag.name);
      });
    }

    // Build a map of entry_id -> tag names
    const entryTagsMap = new Map<string, string[]>();
    (entryTagsResponse.data || []).forEach((et: any) => {
      const tagName = tagsMap.get(et.tag_id);
      if (tagName) {
        const existing = entryTagsMap.get(et.time_entry_id) || [];
        entryTagsMap.set(et.time_entry_id, [...existing, tagName]);
      }
    });

    // Map entries with their tags
    // Note: Backend already converts snake_case to camelCase
    const entriesWithTags = (data || []).map((e: any) => ({
      id: e.id,
      projectId: e.projectId,
      calendarId: e.calendarId ?? e.calendar_id ?? null,
      description: e.description || "",
      duration: e.duration,
      date: e.startTime || e.date, // Use startTime as the date
      startTime: e.startTime,
      endTime: e.endTime,
      tags: entryTagsMap.get(e.id) || [],
      createdAt: e.createdAt,
      userId: e.userId,
      isBillable: e.isBillable,
      isRecurring: e.isRecurring,
      recurrenceRule: e.recurrenceRule,
      parentEntryId: e.parentEntryId,
    }));

    return entriesWithTags;
  },

  async addEntry(entry: Omit<TimeEntry, "id" | "createdAt">, userId: string): Promise<TimeEntry> {
    // Calculate start_time and end_time from date and duration
    const startTime = new Date(entry.date);
    const endTime = new Date(startTime.getTime() + (entry.duration * 1000));
    
    // Insert and select the full row back
    const response = await supabase
      .from("time_entries")
      .insert({
        user_id: userId,
        project_id: entry.projectId,
        calendar_id: entry.calendarId || null,
        description: entry.description,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration: entry.duration,
        is_billable: entry.isBillable !== undefined ? entry.isBillable : true,
        is_recurring: entry.isRecurring || false,
        recurrence_rule: entry.recurrenceRule || null,
        parent_entry_id: entry.parentEntryId || null,
      })
      .select("*")
      .single();

    if (response.error) throw new Error(response.error.message);
    
    const insertedEntry = response.data;
    if (!insertedEntry) {
      throw new Error("Failed to create entry");
    }

    // Add tags if we have tags
    if (entry.tags.length > 0 && insertedEntry.id) {
      // Get all existing tags for the user
      const tagsResponse = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", userId);

      const existingTags = tagsResponse.data || [];

      for (const tagName of entry.tags) {
        let tag = existingTags.find((t: any) => t.name === tagName);

        // Create tag if it doesn't exist
        if (!tag) {
          const newTagResponse = await supabase
            .from("tags")
            .insert({ 
              name: tagName, 
              user_id: userId,
              color: '#' + Math.floor(Math.random()*16777215).toString(16) // Random color
            })
            .select()
            .single();
          
          if (newTagResponse.error) {
            console.error('[addEntry] Error creating tag:', newTagResponse.error);
            // Continue without the tag rather than failing the whole entry
            continue;
          }
          
          tag = newTagResponse.data;
        }

        // Link tag to entry
        if (tag) {
          await supabase.from("time_entry_tags").insert({
            time_entry_id: insertedEntry.id,
            tag_id: tag.id,
          });
        }
      }
    }

    // Format and return the entry as TimeEntry
    return {
      id: insertedEntry.id,
      projectId: insertedEntry.project_id,
      calendarId: insertedEntry.calendar_id,
      description: insertedEntry.description || "",
      duration: insertedEntry.duration,
      date: insertedEntry.start_time || entry.date,
      tags: entry.tags || [],
      createdAt: insertedEntry.created_at,
      userId: insertedEntry.user_id,
      startTime: insertedEntry.start_time,
      endTime: insertedEntry.end_time,
      isBillable: insertedEntry.is_billable,
      isRecurring: insertedEntry.is_recurring,
      recurrenceRule: insertedEntry.recurrence_rule,
      parentEntryId: insertedEntry.parent_entry_id,
    };
  },

  async updateEntry(id: string, updates: Partial<TimeEntry>) {
    const { error } = await supabase
      .from("time_entries")
      .update({
        description: updates.description,
        duration: updates.duration,
        project_id: updates.projectId,
        calendar_id: updates.calendarId,
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
      id: c.id.toString(),
      name: c.name,
      email: c.email || c.contact_email || undefined,
      company: c.company || undefined,
      address: c.address || undefined,
      phone: c.phone || undefined,
      notes: c.notes || undefined,
      createdAt: c.created_at,
    }));
  },

  async addClient(client: Omit<Client, "id" | "createdAt">, userId: string) {
    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: client.name,
        email: client.email,
        company: client.company,
        address: client.address,
        phone: client.phone,
        notes: client.notes,
        user_id: userId,
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
    const response = await supabase.auth.getUser();
    const user = response?.data?.user;
    if (!user) throw new Error("Not authenticated");

    // Optimized: Get current user with their team members in a single query
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, team_id")
      .eq("id", user.id)
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
    const response = await supabase.auth.getUser();
    const user = response?.data?.user;
    if (!user) throw new Error("Not authenticated");

    // Get current user's team_id and role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("team_id, role")
      .eq("id", user.id)
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
    const response = await supabase.auth.getUser();
    const user = response?.data?.user;
    if (!user) throw new Error("Not authenticated");

    // Get current user's role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
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
    const response = await supabase.auth.getUser();
    const user = response?.data?.user;
    if (!user) throw new Error("Not authenticated");

    // Create team
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name,
        created_by: user.id,
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
      .eq("id", user.id);

    if (userError) throw userError;

    return team;
  },

  // User Settings
  async getUserSettings(): Promise<UserSettings | null> {
    const response = await supabase.auth.getUser();
    const user = response?.data?.user;
    if (!user) return null; // Return null instead of throwing error

    const { data, error } = await supabase
      .from("users")
      .select("settings")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching user settings:", error);
      return null;
    }
    return data?.settings as UserSettings || null;
  },

  async updateUserSettings(settings: Partial<UserSettings>): Promise<void> {
    const response = await supabase.auth.getUser();
    const user = response?.data?.user;
    if (!user) throw new Error("Not authenticated");

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
      .eq("id", user.id);

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
    const response = await supabase.auth.getUser();
    const user = response?.data?.user;
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("project_invitations")
      .insert({
        project_id: projectId,
        email,
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: Send invitation email via Edge Function
    // For now, just return the invitation data
    return data as any;
  },

  async acceptProjectInvitation(token: string): Promise<void> {
    const response = await supabase.auth.getUser();
    const user = response?.data?.user;
    if (!user) throw new Error("Not authenticated");

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
    if (invitation.email !== user.email) {
      throw new Error("This invitation is for a different email address");
    }

    // Add user to project
    await this.addProjectMember(
      invitation.project_id,
      user.id,
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
