import { useState, useEffect } from "react";
import { storage, Project } from "@/lib/storage";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    setProjects(storage.getProjects());
  };

  const addProject = () => {
    if (!newProjectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    storage.addProject({
      name: newProjectName.trim(),
      color: selectedColor,
    });

    setNewProjectName("");
    setSelectedColor(PRESET_COLORS[0]);
    setIsAdding(false);
    loadProjects();
    toast.success("Project created");
  };

  const deleteProject = (id: string) => {
    // Check if project has entries
    const entries = storage.getEntries();
    const hasEntries = entries.some(e => e.projectId === id);

    if (hasEntries) {
      toast.error("Cannot delete project with existing entries");
      return;
    }

    storage.deleteProject(id);
    loadProjects();
    toast.success("Project deleted");
  };

  return (
    <div className="container mx-auto px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {projects.length} projects
          </p>
        </div>
        <Button
          variant="default"
          onClick={() => setIsAdding(!isAdding)}
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
              if (e.key === 'Enter') addProject();
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
            <Button variant="default" onClick={addProject}>
              Create Project
            </Button>
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 mb-4 flex items-center justify-center">
            <div className="w-12 h-12 border-2 border-dashed border-muted-foreground rounded" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground">Create your first project to start tracking time</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((project, index) => {
            const entries = storage.getEntries().filter(e => e.projectId === project.id);
            const totalTime = entries.reduce((sum, e) => sum + e.duration, 0);
            const totalHours = (totalTime / 3600).toFixed(1);

            return (
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
                    {entries.length} entries • {totalHours}h tracked
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteProject(project.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
