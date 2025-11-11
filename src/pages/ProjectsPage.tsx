import { useState } from "react";
import { Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/hooks/useProjects";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

const PRESET_COLORS = [
  "#0A84FF", // Electric Blue
  "#FF453A", // Red
  "#FF9F0A", // Orange
  "#FFD60A", // Yellow
  "#32D74B", // Green
  "#64D2FF", // Light Blue
  "#BF5AF2", // Purple
  "#FF375F", // Pink
  "#AC8E68", // Brown
  "#98989D", // Gray
  "#5E5CE6", // Indigo
  "#00C7BE", // Teal
];

export default function ProjectsPage() {
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [isAdding, setIsAdding] = useState(false);

  const {
    projects,
    isLoading,
    error,
    addProject,
    deleteProject,
    isAdding: isCreating,
    isDeleting,
  } = useProjects();

  const handleAddProject = () => {
    if (!newProjectName.trim()) {
      return;
    }

    addProject({
      name: newProjectName.trim(),
      color: selectedColor,
    });

    setNewProjectName("");
    setSelectedColor(PRESET_COLORS[0]);
    setIsAdding(false);
  };

  const handleDeleteProject = (id: string) => {
    if (confirm("Are you sure you want to archive this project?")) {
      deleteProject(id);
    }
  };

  // Show database error if tables don't exist
  const isDatabaseError = error && (error.message?.includes('404') || (error as any).code === 'PGRST116');

  return (
    <div className="container mx-auto px-8 py-8">
      {isDatabaseError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Database Not Set Up</AlertTitle>
          <AlertDescription>
            The database tables haven't been created yet. Please run the migration first.
            <br />
            <span className="text-sm mt-2 block">
              Run: <code className="bg-black/10 px-2 py-1 rounded">./run-architecture-migration.sh</code> in your terminal
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isLoading ? "Loading..." : `${projects.length} projects`}
          </p>
        </div>
        <Button
          variant="default"
          onClick={() => setIsAdding(!isAdding)}
          disabled={isLoading}
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {isAdding && (
        <div className="mb-8 p-6 border border-border rounded bg-surface space-y-4 animate-slide-in">
          <Input
            placeholder="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddProject();
              if (e.key === 'Escape') setIsAdding(false);
            }}
            autoFocus
          />
          
          <div className="space-y-2">
            <div className="text-sm font-medium">Color</div>
            <div className="grid grid-cols-12 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  style={{
                    backgroundColor: color,
                    border: selectedColor === color ? '3px solid white' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: selectedColor === color ? '0 0 0 1px black' : 'none',
                  }}
                  onClick={() => setSelectedColor(color)}
                  aria-label={color}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="default" onClick={handleAddProject} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded border border-border">
              <Skeleton className="w-4 h-4 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 mb-4 flex items-center justify-center">
            <div className="w-12 h-12 border-2 border-dashed border-muted-foreground rounded" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground">Create your first project to start tracking time</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="group flex items-center gap-4 p-4 rounded border border-border hover:bg-surface transition-colors animate-slide-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <div className="flex-1">
                <div className="font-semibold">{project.name}</div>
                <div className="text-sm text-muted-foreground">
                  {project.clientId && "Client project"} • {project.hourlyRate ? `$${project.hourlyRate}/hr` : "No rate set"}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteProject(project.id)}
                disabled={isDeleting}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
