# Migration Guide: localStorage to Supabase

This guide helps you migrate from local storage to Supabase for multi-user support.

## Prerequisites

1. Supabase project created
2. Environment variables configured in `.env`
3. Database migrations run

## Step-by-Step Migration

### 1. Run Database Migration

```bash
# If using local Supabase
supabase db push

# Or run the SQL directly in Supabase Dashboard
# Copy contents of: supabase/migrations/20241111_initial_schema.sql
```

### 2. Create Data Migration Utility

Create `src/lib/migrate-data.ts`:

```typescript
import { supabase } from "@/integrations/supabase/client";
import { storage } from "./storage";

export async function migrateLocalDataToSupabase(userId: string) {
  try {
    // Migrate projects
    const localProjects = storage.getProjects();
    for (const project of localProjects) {
      await supabase.from("projects").insert({
        id: project.id,
        name: project.name,
        color: project.color,
        created_by: userId,
        created_at: project.createdAt,
      });
    }

    // Migrate time entries
    const localEntries = storage.getEntries();
    for (const entry of localEntries) {
      const { data: supabaseEntry } = await supabase
        .from("time_entries")
        .insert({
          id: entry.id,
          user_id: userId,
          project_id: entry.projectId,
          description: entry.description,
          duration: entry.duration,
          date: entry.date,
          created_at: entry.createdAt,
        })
        .select()
        .single();

      // Migrate tags if entry has tags
      if (entry.tags.length > 0 && supabaseEntry) {
        for (const tagName of entry.tags) {
          // Get or create tag
          let { data: tag } = await supabase
            .from("tags")
            .select()
            .eq("name", tagName)
            .single();

          if (!tag) {
            const { data: newTag } = await supabase
              .from("tags")
              .insert({ name: tagName, created_by: userId })
              .select()
              .single();
            tag = newTag;
          }

          // Link tag to entry
          if (tag) {
            await supabase.from("entry_tags").insert({
              entry_id: supabaseEntry.id,
              tag_id: tag.id,
            });
          }
        }
      }
    }

    console.log("Migration completed successfully!");
    return { success: true };
  } catch (error) {
    console.error("Migration failed:", error);
    return { success: false, error };
  }
}
```

### 3. Update Storage Module

Create `src/lib/supabase-storage.ts`:

```typescript
import { supabase } from "@/integrations/supabase/client";
import { TimeEntry, Project, TimerState } from "./storage";

export const supabaseStorage = {
  // Projects
  async getProjects(teamId?: string): Promise<Project[]> {
    const query = supabase.from("projects").select("*").eq("is_archived", false);
    
    if (teamId) {
      query.eq("team_id", teamId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      createdAt: p.created_at,
    }));
  },

  async addProject(project: Omit<Project, "id" | "createdAt">, userId: string) {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: project.name,
        color: project.color,
        created_by: userId,
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
      })
      .eq("id", id);
    
    if (error) throw error;
  },

  async deleteProject(id: string) {
    // Soft delete
    const { error } = await supabase
      .from("projects")
      .update({ is_archived: true })
      .eq("id", id);
    
    if (error) throw error;
  },

  // Time Entries
  async getEntries(userId: string, filters?: any): Promise<TimeEntry[]> {
    let query = supabase
      .from("time_entries")
      .select(`
        *,
        entry_tags(tag_id, tags(name))
      `)
      .eq("user_id", userId)
      .order("date", { ascending: false });

    // Apply filters
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
      tags: e.entry_tags?.map((et: any) => et.tags.name) || [],
      createdAt: e.created_at,
    }));
  },

  async addEntry(entry: Omit<TimeEntry, "id" | "createdAt">, userId: string) {
    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        user_id: userId,
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
          .single();

        if (!tag) {
          const { data: newTag } = await supabase
            .from("tags")
            .insert({ name: tagName, created_by: userId })
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

  async deleteEntry(id: string) {
    const { error } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  },

  // Timer State (keep in localStorage for now)
  getTimerState(): TimerState {
    const data = localStorage.getItem("timetrack_timer");
    return data ? JSON.parse(data) : {
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      currentProjectId: null,
      currentDescription: "",
    };
  },

  saveTimerState(state: TimerState) {
    localStorage.setItem("timetrack_timer", JSON.stringify(state));
  },
};
```

### 4. Create Custom Hooks

Create `src/hooks/useProjects.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseStorage } from "@/lib/supabase-storage";
import { useAuth } from "@/contexts/AuthContext";
import { Project } from "@/lib/storage";
import { toast } from "sonner";

export function useProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
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
    onError: (error) => {
      toast.error("Failed to create project");
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
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supabaseStorage.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
  });

  return {
    projects,
    isLoading,
    addProject: addMutation.mutate,
    updateProject: updateMutation.mutate,
    deleteProject: deleteMutation.mutate,
  };
}
```

Create `src/hooks/useTimeEntries.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseStorage } from "@/lib/supabase-storage";
import { useAuth } from "@/contexts/AuthContext";
import { TimeEntry } from "@/lib/storage";
import { toast } from "sonner";

export function useTimeEntries(filters?: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["time-entries", user?.id, filters],
    queryFn: () => supabaseStorage.getEntries(user!.id, filters),
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: (entry: Omit<TimeEntry, "id" | "createdAt">) =>
      supabaseStorage.addEntry(entry, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success("Entry added");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supabaseStorage.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success("Entry deleted");
    },
  });

  return {
    entries,
    isLoading,
    addEntry: addMutation.mutate,
    deleteEntry: deleteMutation.mutate,
  };
}
```

### 5. Update App.tsx

```typescript
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<TimerPage />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/entries" element={<EntriesPage />} />
                      <Route path="/projects" element={<ProjectsPage />} />
                      <Route path="/tags" element={<TagsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);
```

### 6. Update Components to Use Hooks

Update `src/pages/ProjectsPage.tsx`:

```typescript
import { useProjects } from "@/hooks/useProjects";

export default function ProjectsPage() {
  const { projects, isLoading, addProject, updateProject, deleteProject } = useProjects();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Rest of component using projects, addProject, etc.
}
```

Update `src/pages/EntriesPage.tsx`:

```typescript
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useProjects } from "@/hooks/useProjects";

export default function EntriesPage() {
  const [filters, setFilters] = useState<FilterState>({...});
  const { entries, isLoading, deleteEntry } = useTimeEntries(filters);
  const { projects } = useProjects();

  // Rest of component
}
```

### 7. Add Migration Button to Settings

In `src/pages/SettingsPage.tsx`, add a migration button:

```typescript
import { migrateLocalDataToSupabase } from "@/lib/migrate-data";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const [migrating, setMigrating] = useState(false);

  const handleMigrate = async () => {
    if (!user) return;
    
    setMigrating(true);
    const result = await migrateLocalDataToSupabase(user.id);
    setMigrating(false);
    
    if (result.success) {
      toast.success("Data migrated successfully!");
    } else {
      toast.error("Migration failed. Check console for details.");
    }
  };

  return (
    <div>
      {/* Other settings */}
      
      <Card>
        <CardHeader>
          <CardTitle>Data Migration</CardTitle>
          <CardDescription>
            Migrate your local data to cloud storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleMigrate} disabled={migrating}>
            {migrating ? "Migrating..." : "Migrate Local Data"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 8. Real-time Subscriptions (Optional)

Add real-time updates in your hooks:

```typescript
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTimeEntries(filters?: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ... existing code

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

  // ... rest of hook
}
```

## Testing the Migration

1. **Backup local data**: Export to CSV before migrating
2. **Test signup flow**: Create new account
3. **Test migration**: Use migration button
4. **Verify data**: Check if all projects and entries appear
5. **Test CRUD**: Create, read, update, delete operations
6. **Test filters**: Ensure filtering still works
7. **Test real-time**: Open in two tabs, make changes

## Rollback Plan

If migration fails:
1. Data is still in localStorage (not removed automatically)
2. Comment out AuthProvider wrapper to use local mode
3. Fix issues and retry migration
4. Contact support if data corruption occurs

## Performance Considerations

1. **Lazy Loading**: Load data only when needed
2. **Pagination**: For large datasets (1000+ entries)
3. **Caching**: React Query handles this automatically
4. **Indexes**: Already created in migration SQL
5. **Real-time**: Use sparingly to avoid excessive subscriptions

## Security Checklist

- [ ] Environment variables not committed
- [ ] RLS policies tested
- [ ] Role-based access working
- [ ] No sensitive data in console logs
- [ ] HTTPS enforced in production
- [ ] Email verification enabled

---

**Estimated Migration Time**: 30-60 minutes
**Difficulty**: Intermediate
**Risk Level**: Low (data preserved in localStorage)
