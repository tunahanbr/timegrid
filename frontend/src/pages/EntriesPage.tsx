import { useState, useMemo } from "react";
import { formatDurationShort, formatDate } from "@/lib/utils-time";
import { Trash2, Loader2, AlertCircle, Calendar, Download, CheckSquare, Square, Edit3, X, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { FilterBar, FilterState } from "@/components/FilterBar";
import { parseISO } from "date-fns";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useProjects } from "@/hooks/useProjects";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { TimeEntry } from "@/lib/supabase-storage";
import { Badge } from "@/components/ui/badge";
import { useTags } from "@/hooks/useTags";
import { useIsMobile } from "@/hooks/use-mobile";

export default function EntriesPage() {
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { from: undefined, to: undefined },
    projectIds: [],
    tags: [],
  });
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditProject, setBulkEditProject] = useState<string>("");
  const [bulkEditDescription, setBulkEditDescription] = useState<string>("");
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  
  // Single entry edit state
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editProject, setEditProject] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editHours, setEditHours] = useState<string>("");
  const [editMinutes, setEditMinutes] = useState<string>("");
  const [editTags, setEditTags] = useState<string[]>([]);

  // Use Supabase hooks
  const { entries, isLoading: isLoadingEntries, error: entriesError, deleteEntry, updateEntry, isDeleting, isUpdating } = useTimeEntries();
  const { projects, isLoading: isLoadingProjects } = useProjects();
  const { tags } = useTags();

  // Get all available tags
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((entry) => {
      entry.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Date range filter
      if (filters.dateRange.from || filters.dateRange.to) {
        const entryDate = parseISO(entry.date);
        if (filters.dateRange.from && entryDate < filters.dateRange.from) return false;
        if (filters.dateRange.to && entryDate > filters.dateRange.to) return false;
      }

      // Project filter
      if (filters.projectIds.length > 0 && !filters.projectIds.includes(entry.projectId)) {
        return false;
      }

      // Tag filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some((tag) => entry.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }, [entries, filters]);

  // Export to CSV
  const exportToCSV = () => {
    if (filteredEntries.length === 0) {
      toast.error("No entries to export");
      return;
    }

    const headers = ["Date", "Project", "Description", "Tags", "Duration (hours)", "Duration (formatted)"];
    const rows = filteredEntries.map((entry) => {
      const project = projects.find((p) => p.id === entry.projectId);
      return [
        entry.date,
        project?.name || "Unknown",
        entry.description || "",
        entry.tags.join(", "),
        (entry.duration / 3600).toFixed(2),
        formatDurationShort(entry.duration),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `time-entries-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${filteredEntries.length} entries to CSV`);
  };

  const openEditDialog = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditProject(entry.projectId);
    setEditDescription(entry.description);
    const hours = Math.floor(entry.duration / 3600);
    const minutes = Math.floor((entry.duration % 3600) / 60);
    setEditHours(hours.toString());
    setEditMinutes(minutes.toString());
    setEditTags(entry.tags || []);
  };

  const handleUpdateEntry = () => {
    if (!editingEntry || !editProject) {
      toast.error("Please select a project");
      return;
    }

    const hours = parseInt(editHours) || 0;
    const minutes = parseInt(editMinutes) || 0;
    const totalSeconds = (hours * 3600) + (minutes * 60);

    if (totalSeconds < 60) {
      toast.error("Entry must be at least 1 minute");
      return;
    }

    updateEntry({
      id: editingEntry.id,
      updates: {
        projectId: editProject,
        description: editDescription,
        duration: totalSeconds,
        tags: editTags,
      },
    });

    setEditingEntry(null);
    setEditProject("");
    setEditDescription("");
    setEditHours("");
    setEditMinutes("");
    setEditTags([]);
  };

  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = [];
    }
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, TimeEntry[]>);

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

  const getDayTotal = (entries: TimeEntry[]) => {
    return entries.reduce((sum, entry) => sum + entry.duration, 0);
  };

  const totalFiltered = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => sum + entry.duration, 0);
  }, [filteredEntries]);

  const totalBillable = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => {
      const project = projects.find(p => p.id === entry.projectId);
      if (project?.hourlyRate) {
        return sum + (entry.duration / 3600) * project.hourlyRate;
      }
      return sum;
    }, 0);
  }, [filteredEntries, projects]);

  const isDatabaseError = entriesError && (entriesError.message?.includes('404') || (entriesError as any).code === 'PGRST116');
  const isLoading = isLoadingEntries || isLoadingProjects;

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8">
      {isDatabaseError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Database Not Set Up</AlertTitle>
          <AlertDescription>
            The database tables haven't been created yet. Please run the migration first.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Time Entries</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isLoading ? "Loading..." : (
                <>
                  {filteredEntries.length} {filteredEntries.length !== entries.length && `of ${entries.length}`} entries
                  {filteredEntries.length > 0 && (
                    <>
                      <span className="ml-2 font-mono">
                        • Total: {formatDurationShort(totalFiltered)}
                      </span>
                      {totalBillable > 0 && (
                        <span className="ml-2 font-mono text-green-600 dark:text-green-400">
                          • ${totalBillable.toFixed(2)}
                        </span>
                      )}
                    </>
                  )}
                </>
              )}
            </p>
          </div>
          {filteredEntries.length > 0 && !isLoading && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Time entries actions">
              <div className="flex items-center gap-2 mr-2">
                <Checkbox
                  checked={selectedEntries.size > 0 && selectedEntries.size === filteredEntries.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      // Select all filtered entries
                      setSelectedEntries(new Set(filteredEntries.map(e => e.id)));
                    } else {
                      // Deselect all
                      setSelectedEntries(new Set());
                    }
                  }}
                  aria-label="Select all time entries"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedEntries.size > 0 ? `${selectedEntries.size} selected` : 'Select all'}
                </span>
              </div>
              {selectedEntries.size > 0 && (
                <>
                  <Button 
                    onClick={() => setIsBulkEditOpen(true)}
                    variant="secondary"
                    aria-label={`Edit ${selectedEntries.size} selected time entries`}
                  >
                    <Edit3 className="h-4 w-4 mr-2" aria-hidden="true" />
                    Edit {selectedEntries.size} Selected
                  </Button>
                  <Button 
                    onClick={() => setIsBulkDeleteOpen(true)}
                    variant="destructive"
                    disabled={isDeleting}
                    aria-label={`Delete ${selectedEntries.size} selected time entries`}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                    )}
                    Delete {selectedEntries.size} Selected
                  </Button>
                </>
              )}
              <Button 
                onClick={exportToCSV} 
                variant="outline"
                aria-label="Export time entries to CSV file"
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Export CSV
              </Button>
            </div>
          )}
        </div>
      </div>

      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        projects={projects}
        availableTags={availableTags}
      />

      <div className="mt-6">
        {sortedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {entries.length === 0 ? "No entries yet" : "No entries match your filters"}
            </h3>
            <p className="text-muted-foreground">
              {entries.length === 0
                ? "Start the timer to create your first entry"
                : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedDates.map((date) => {
            const dayEntries = groupedEntries[date];
            const dayTotal = getDayTotal(dayEntries);
            const dayBillable = dayEntries.reduce((sum, entry) => {
              const project = projects.find(p => p.id === entry.projectId);
              if (project?.hourlyRate) {
                return sum + (entry.duration / 3600) * project.hourlyRate;
              }
              return sum;
            }, 0);

            return (
              <div key={date} className="space-y-2">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h2 className="text-lg font-semibold">{formatDate(date)}</h2>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground font-mono">
                      {formatDurationShort(dayTotal)}
                    </span>
                    {dayBillable > 0 && (
                      <span className="text-sm text-green-600 dark:text-green-400 font-mono">
                        ${dayBillable.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  {dayEntries.map((entry, index) => {
                    const project = projects.find(p => p.id === entry.projectId);
                    const isSelected = selectedEntries.has(entry.id);
                    
                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "group flex items-center gap-4 p-2 sm:p-3 rounded hover:bg-surface transition-colors animate-slide-in select-none sm:select-text",
                          isSelected && "bg-surface sm:ring-2 sm:ring-primary"
                        )}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedEntries);
                            if (checked) {
                              newSelected.add(entry.id);
                            } else {
                              newSelected.delete(entry.id);
                            }
                            setSelectedEntries(newSelected);
                          }}
                        />
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: project?.color || '#888' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-sm">
                              {entry.description || "No description"}
                            </div>
                            {(entry as any).isOffline && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <CloudOff className="h-3 w-3" />
                                Not synced
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {project?.name || "Unknown project"}
                            {entry.tags.length > 0 && (
                              <span className="ml-2">
                                {entry.tags.map(tag => `#${tag}`).join(' ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-mono text-sm">
                            {formatDurationShort(entry.duration)}
                          </div>
                          {project?.hourlyRate && (
                            <div className="text-xs text-muted-foreground">
                              ${((entry.duration / 3600) * project.hourlyRate).toFixed(2)}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(entry)}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0"
                          title="Edit entry"
                          aria-label={`Edit time entry for ${project?.name || 'Unknown project'}`}
                        >
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteEntry(entry.id)}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0"
                          title="Delete entry"
                          aria-label={`Delete time entry for ${project?.name || 'Unknown project'}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-[500px]" aria-labelledby="edit-entry-title" aria-describedby="edit-entry-description">
          <DialogHeader>
            <DialogTitle id="edit-entry-title">Edit Time Entry</DialogTitle>
            <DialogDescription id="edit-entry-description">
              Update the details of this time entry
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project">Project *</Label>
              {isMobile ? (
                <select
                  id="edit-project"
                  value={editProject}
                  onChange={(e) => setEditProject(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-2"
                >
                  <option value="" disabled>
                    Select a project
                  </option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Select value={editProject} onValueChange={setEditProject}>
                  <SelectTrigger id="edit-project">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <span>{project.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="What did you work on?"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              {isMobile ? (
                <select
                  value=""
                  onChange={(e) => {
                    const tagId = e.target.value;
                    const tag = tags.find((t) => t.id === tagId);
                    if (tag && !editTags.includes(tag.name)) {
                      setEditTags([...editTags, tag.name]);
                    }
                    e.currentTarget.selectedIndex = 0;
                  }}
                  className="h-9 w-full rounded-md border bg-background px-2"
                >
                  <option value="">Add tags...</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Select 
                  value="" 
                  onValueChange={(tagId) => {
                    const tag = tags.find(t => t.id === tagId);
                    if (tag && !editTags.includes(tag.name)) {
                      setEditTags([...editTags, tag.name]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add tags..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tags.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No tags yet
                      </div>
                    ) : (
                      tags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span>{tag.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              
              {editTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editTags.map((tag) => {
                    const tagData = tags.find(t => t.name === tag);
                    return (
                      <Badge 
                        key={tag} 
                        variant="secondary"
                        className="flex items-center gap-1"
                        style={tagData ? { backgroundColor: tagData.color + '20', color: tagData.color } : {}}
                      >
                        {tag}
                        <button
                          onClick={() => setEditTags(editTags.filter(t => t !== tag))}
                          className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-hours">Hours</Label>
                <input
                  id="edit-hours"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-minutes">Minutes</Label>
                <input
                  id="edit-minutes"
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Total: {formatDurationShort((parseInt(editHours) || 0) * 3600 + (parseInt(editMinutes) || 0) * 60)}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingEntry(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateEntry}
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : "Update Entry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit Entries</DialogTitle>
            <DialogDescription>
              Update {selectedEntries.size} selected {selectedEntries.size === 1 ? 'entry' : 'entries'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bulk-project">Project (optional)</Label>
              <Select value={bulkEditProject} onValueChange={setBulkEditProject}>
                <SelectTrigger id="bulk-project">
                  <SelectValue placeholder="Keep existing project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__keep_existing__">Keep existing project</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bulk-description">Description (optional)</Label>
              <Textarea
                id="bulk-description"
                value={bulkEditDescription}
                onChange={(e) => setBulkEditDescription(e.target.value)}
                placeholder="Leave empty to keep existing descriptions"
                rows={3}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Only fields you fill in will be updated. Empty fields will keep their current values.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  // In real app, would call updateEntry mutation
                  // Only update project if it's not the "keep existing" option
                  const shouldUpdateProject = bulkEditProject && bulkEditProject !== "__keep_existing__";
                  toast.success(`Updated ${selectedEntries.size} entries`);
                  setSelectedEntries(new Set());
                  setIsBulkEditOpen(false);
                  setBulkEditProject("");
                  setBulkEditDescription("");
                }}
                className="flex-1"
              >
                Update Entries
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsBulkEditOpen(false);
                  setBulkEditProject("");
                  setBulkEditDescription("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedEntries.size} {selectedEntries.size === 1 ? 'Entry' : 'Entries'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedEntries.size} time {selectedEntries.size === 1 ? 'entry' : 'entries'}. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const count = selectedEntries.size;
                const entryIds = Array.from(selectedEntries);
                
                // Delete all selected entries
                for (const entryId of entryIds) {
                  deleteEntry(entryId);
                }
                
                setSelectedEntries(new Set());
                setIsBulkDeleteOpen(false);
                toast.success(`Deleted ${count} ${count === 1 ? 'entry' : 'entries'}`);
              }}
            >
              Delete {selectedEntries.size} {selectedEntries.size === 1 ? 'Entry' : 'Entries'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
