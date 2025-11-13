import { useState } from "react";
import { Plus, Trash2, Loader2, AlertCircle, Share2, Mail, Edit3, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const { toast } = useToast();
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [newHourlyRate, setNewHourlyRate] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [sharingProject, setSharingProject] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  
  // Delete confirmation dialog state
  const [deletingProject, setDeletingProject] = useState<any>(null);
  
  // Edit project state
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectColor, setEditProjectColor] = useState(PRESET_COLORS[0]);
  const [editProjectClient, setEditProjectClient] = useState<string | null>(null);
  const [editHourlyRate, setEditHourlyRate] = useState("");

  const {
    projects,
    isLoading,
    error,
    addProject,
    updateProject,
    deleteProject,
    isAdding: isCreating,
    isUpdating,
    isDeleting,
  } = useProjects();

  const { clients } = useClients();

  const handleAddProject = () => {
    console.log('[ProjectsPage] handleAddProject called');
    console.log('[ProjectsPage] newProjectName:', newProjectName);
    console.log('[ProjectsPage] navigator.onLine:', navigator.onLine);
    console.log('[ProjectsPage] addProject function:', typeof addProject, addProject);
    console.log('[ProjectsPage] isCreating:', isCreating);
    
    if (!newProjectName.trim()) {
      console.log('[ProjectsPage] Empty project name, returning');
      return;
    }

    console.log('[ProjectsPage] Calling addProject mutation');
    try {
      const result = addProject({
        name: newProjectName.trim(),
        color: selectedColor,
        clientId: selectedClient || undefined,
        hourlyRate: newHourlyRate ? parseFloat(newHourlyRate) : undefined,
      });
      console.log('[ProjectsPage] addProject result:', result);
    } catch (error) {
      console.error('[ProjectsPage] Error calling addProject:', error);
    }

    setNewProjectName("");
    setSelectedColor(PRESET_COLORS[0]);
    setSelectedClient(null);
    setNewHourlyRate("");
    setIsAdding(false);
  };

  const handleDeleteProject = async (id: string) => {
    console.log('[ProjectsPage] Delete button clicked for project:', id);
    
    // Open the delete confirmation dialog instead of using window.confirm
    const project = projects.find(p => p.id === id);
    setDeletingProject(project);
  };

  const confirmDelete = () => {
    if (!deletingProject) return;
    
    console.log('[ProjectsPage] User confirmed delete, calling deleteProject for:', deletingProject.id);
    deleteProject(deletingProject.id);
    setDeletingProject(null);
  };

  const openEditDialog = (project: any) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectColor(project.color);
    setEditProjectClient(project.clientId || null);
    setEditHourlyRate(project.hourlyRate ? project.hourlyRate.toString() : "");
  };

  const handleUpdateProject = () => {
    if (!editProjectName.trim() || !editingProject) {
      return;
    }

    updateProject({
      id: editingProject.id,
      updates: {
        name: editProjectName.trim(),
        color: editProjectColor,
        clientId: editProjectClient || undefined,
        hourlyRate: editHourlyRate ? parseFloat(editHourlyRate) : undefined,
      },
    });

    setEditingProject(null);
    setEditProjectName("");
    setEditProjectColor(PRESET_COLORS[0]);
    setEditProjectClient(null);
    setEditHourlyRate("");
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !sharingProject) return;

    setIsSendingInvite(true);
    try {
      // In a real app, this would call an API endpoint
      // For now, just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Invitation sent",
        description: `Invited ${inviteEmail} as ${inviteRole} to ${sharingProject.name}`,
      });

      setSharingProject(null);
      setInviteEmail("");
      setInviteRole("member");
    } catch (error: any) {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSendingInvite(false);
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
            <div className="text-sm font-medium">Client (Optional)</div>
            <Select value={selectedClient || "none"} onValueChange={(value) => setSelectedClient(value === "none" ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Hourly Rate (Optional)</div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={newHourlyRate}
                onChange={(e) => setNewHourlyRate(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>
          
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
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{project.name}</div>
                  {(project as any).isOffline && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <CloudOff className="h-3 w-3" />
                      Not synced
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {project.clientId && (
                    <>
                      {clients.find(c => c.id === project.clientId)?.name || "Client"} •{" "}
                    </>
                  )}
                  {project.hourlyRate ? `$${project.hourlyRate}/hr` : "No rate set"}
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(project)}
                  title="Edit project"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSharingProject(project)}
                  title="Share project"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteProject(project.id)}
                  disabled={isDeleting}
                  title="Archive project"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the project name, hourly rate, and color
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-project-name">Project Name</Label>
              <Input
                id="edit-project-name"
                placeholder="Project name"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateProject()}
              />
            </div>

            <div>
              <Label>Client (Optional)</Label>
              <Select value={editProjectClient || "none"} onValueChange={(value) => setEditProjectClient(value === "none" ? null : value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-hourly-rate">Hourly Rate (Optional)</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="edit-hourly-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={editHourlyRate}
                  onChange={(e) => setEditHourlyRate(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            <div>
              <Label>Project Color</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-10 h-10 rounded border-2 transition-all",
                      editProjectColor === color
                        ? "border-primary scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{
                      backgroundColor: color,
                    }}
                    onClick={() => setEditProjectColor(color)}
                    aria-label={color}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="default" 
                onClick={handleUpdateProject} 
                disabled={isUpdating || !editProjectName.trim()}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Project"
                )}
              </Button>
              <Button variant="outline" onClick={() => setEditingProject(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Project Dialog */}
      <Dialog open={!!sharingProject} onOpenChange={(open) => !open && setSharingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Project</DialogTitle>
            <DialogDescription>
              Invite team members to collaborate on "{sharingProject?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address</Label>
              <div className="flex gap-2 mt-1">
                <Mail className="h-5 w-5 text-muted-foreground mt-2" />
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member - Can track time and view entries</SelectItem>
                  <SelectItem value="admin">Admin - Can manage project and invite others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                An invitation email will be sent to this address. They'll need to create an account to accept.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={handleSendInvite} disabled={isSendingInvite || !inviteEmail.trim()} className="flex-1">
                {isSendingInvite ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setSharingProject(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingProject} onOpenChange={(open) => !open && setDeletingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete "{deletingProject?.name}"? This action cannot be undone and will remove all time entries associated with this project.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeletingProject(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Project
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
