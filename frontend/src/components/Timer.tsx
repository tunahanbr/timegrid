import { useEffect, useState, useCallback } from "react";
import { Play, Pause, Square, Plus, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storage, TimerState } from "@/lib/storage";
import { formatDuration, getTodayISO } from "@/lib/utils-time";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useProjects } from "@/hooks/useProjects";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useTags } from "@/hooks/useTags";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { X as XIcon } from "lucide-react";
import { useTauriEvents } from "@/hooks/useTauriEvents";
import { Switch } from "@/components/ui/switch";
import { useUserSettings } from "@/hooks/useUserSettings";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";

export function Timer() {
  const [timerState, setTimerState] = useState<TimerState>(storage.getTimerState());
  const [currentTime, setCurrentTime] = useState(0);
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isBillable, setIsBillable] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  // Manual entry state
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [manualProject, setManualProject] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualHours, setManualHours] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [manualIsBillable, setManualIsBillable] = useState(true);
  
  // Use Supabase hooks
  const { projects, isLoading: isLoadingProjects } = useProjects();
  const { tags, isLoading: isLoadingTags } = useTags();
  const { addEntry, isAdding } = useTimeEntries();
  const { settings } = useUserSettings();
  const isMobile = useIsMobile();

  // Menu bar updates centralized via tray-updater service; no direct invokes here

  useEffect(() => {
    setDescription(timerState.currentDescription);
  }, [timerState.currentDescription]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timerState.isRunning && !timerState.isPaused && timerState.startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerState.startTime!) / 1000);
        setCurrentTime(timerState.elapsedSeconds + elapsed);
      }, 100);
    } else {
      setCurrentTime(timerState.elapsedSeconds);
    }

    return () => clearInterval(interval);
  }, [timerState]);

  // Listen for timer state changes from other windows (sync)
  useEffect(() => {
    import('@/lib/timer-sync').then(({ onTimerStateChange }) => {
      const cleanup = onTimerStateChange((newState) => {
        setTimerState(newState);
      });
      
      return cleanup;
    });
  }, []);

  const startTimer = useCallback(() => {
    if (!timerState.currentProjectId) {
      toast.error("Please select a project first");
      return;
    }

    const newState: TimerState = {
      isRunning: true,
      isPaused: false,
      startTime: Date.now(),
      elapsedSeconds: 0,
      currentProjectId: timerState.currentProjectId,
      currentDescription: description,
    };
    setTimerState(newState);
    storage.saveTimerState(newState);
  }, [description, timerState.currentProjectId]);

  const pauseTimer = useCallback(() => {
    const newState: TimerState = {
      ...timerState,
      isPaused: true,
      elapsedSeconds: currentTime,
      startTime: null,
    };
    setTimerState(newState);
    storage.saveTimerState(newState);
  }, [currentTime, timerState]);

  const resumeTimer = useCallback(() => {
    const newState: TimerState = {
      ...timerState,
      isPaused: false,
      startTime: Date.now(),
    };
    setTimerState(newState);
    storage.saveTimerState(newState);
  }, [timerState]);

  const stopTimer = () => {
    if (currentTime < 1) {
      toast.error("Timer must run for at least 1 second");
      return;
    }

    // Save to Supabase
    addEntry({
      projectId: timerState.currentProjectId!,
      description: timerState.currentDescription,
      tags: selectedTags,
      duration: currentTime,
      date: getTodayISO(),
      isBillable: isBillable,
    });

    const newState: TimerState = {
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      currentProjectId: timerState.currentProjectId,
      currentDescription: "",
    };
    setTimerState(newState);
    storage.saveTimerState(newState);
    setDescription("");
    setSelectedTags([]);

    // Tray title will reset automatically via tray-updater observing storage
  };

  const cancelTimer = () => {
    const newState: TimerState = {
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      currentProjectId: timerState.currentProjectId,
      currentDescription: "",
    };
    setTimerState(newState);
    storage.saveTimerState(newState);
    setDescription("");
    setSelectedTags([]);
    setShowCancelDialog(false);
    toast.success("Timer cancelled");
  };

  const addManualEntry = () => {
    if (!manualProject) {
      toast.error("Please select a project");
      return;
    }

    const hours = parseInt(manualHours) || 0;
    const minutes = parseInt(manualMinutes) || 0;
    const totalSeconds = (hours * 3600) + (minutes * 60);

    if (totalSeconds < 60) {
      toast.error("Entry must be at least 1 minute");
      return;
    }

    addEntry({
      projectId: manualProject,
      description: manualDescription,
      tags: manualTags,
      duration: totalSeconds,
      date: getTodayISO(),
      isBillable: manualIsBillable,
    });

    // Reset form
    setManualProject("");
    setManualDescription("");
    setManualHours("");
    setManualMinutes("");
    setManualTags([]);
    setManualIsBillable(true);
    setIsManualDialogOpen(false);
  };

  const isIdle = !timerState.isRunning;
  const isRunning = timerState.isRunning && !timerState.isPaused;
  const isPaused = timerState.isRunning && timerState.isPaused;

  // Tauri system tray integration
  const handleToggleTimer = useCallback(() => {
    if (isIdle) {
      startTimer();
    } else if (isRunning) {
      pauseTimer();
    } else if (isPaused) {
      resumeTimer();
    }
  }, [isIdle, isRunning, isPaused, startTimer, pauseTimer, resumeTimer]);

  useTauriEvents(handleToggleTimer);

  // Keyboard shortcuts (disabled on mobile)
  useKeyboardShortcuts([
    {
      key: ' ',
      callback: () => {
        if (isIdle) {
          startTimer();
        } else if (isRunning) {
          pauseTimer();
        } else if (isPaused) {
          resumeTimer();
        }
      },
      description: 'Start/Pause timer',
    },
    {
      key: 's',
      callback: () => {
        if (isRunning || isPaused) {
          stopTimer();
        }
      },
      description: 'Stop timer',
    },
    {
      key: 'Escape',
      callback: () => {
        if (isRunning || isPaused) {
          setShowCancelDialog(true);
        }
      },
      description: 'Cancel timer',
    },
  ], !isMobile);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      {/* Keyboard hint (desktop only) */}
      {!isMobile && (
        <div className="absolute top-4 right-8 text-xs text-muted-foreground">
          <kbd className="px-2 py-1 bg-muted rounded">Space</kbd> to start/pause
          {(isRunning || isPaused) && (
            <>
              {" • "}
              <kbd className="px-2 py-1 bg-muted rounded">S</kbd> to stop
              {" • "}
              <kbd className="px-2 py-1 bg-muted rounded">Esc</kbd> to cancel
            </>
          )}
        </div>
      )}
      <div
        className={cn(
          "relative flex items-center justify-center w-80 h-80 rounded border-2 transition-all duration-300",
          isIdle && "border-border",
          isRunning && "border-primary timer-pulse",
          isPaused && "border-l-[6px] border-l-yellow-500 border-t-border border-r-border border-b-border"
        )}
      >
        <div className="text-center">
          <div className="timer-digits text-6xl font-semibold tracking-tight">
            {formatDuration(currentTime)}
          </div>
          {timerState.currentProjectId && (
            <div className="mt-4 text-sm text-muted-foreground">
              {projects.find(p => p.id === timerState.currentProjectId)?.name}
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-md space-y-4">
        <Select
          value={timerState.currentProjectId || ""}
          onValueChange={(value) => {
            const newState = { ...timerState, currentProjectId: value };
            setTimerState(newState);
            storage.saveTimerState(newState);
          }}
          disabled={timerState.isRunning || isLoadingProjects}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={isLoadingProjects ? "Loading projects..." : "Select project"} />
          </SelectTrigger>
          <SelectContent>
            {projects.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">
                No projects yet. Create one first!
              </div>
            ) : (
              projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span>{project.name}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <Input
          placeholder="What are you working on?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={timerState.isRunning}
          className="w-full"
        />

        {/* Billable toggle */}
        {(settings.userMode === 'freelancer' || settings.userMode === 'team') && (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="billable" className="text-sm font-medium cursor-pointer">
                Billable
              </Label>
              <p className="text-xs text-muted-foreground">
                Mark this time entry as billable to client
              </p>
            </div>
            <Switch
              id="billable"
              checked={isBillable}
              onCheckedChange={setIsBillable}
              disabled={timerState.isRunning}
            />
          </div>
        )}

        {/* Tags selector */}
        <div className="space-y-2">
          <Select 
            value="" 
            onValueChange={(tagId) => {
              const tag = tags.find(t => t.id === tagId);
              if (tag && !selectedTags.includes(tag.name)) {
                setSelectedTags([...selectedTags, tag.name]);
              }
            }}
            disabled={timerState.isRunning || isLoadingTags}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingTags ? "Loading tags..." : "Add tags..."} />
            </SelectTrigger>
            <SelectContent>
              {tags.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  No tags yet. Create one in Tags page!
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
          
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => {
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
                      onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                      className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                      disabled={timerState.isRunning}
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4" role="group" aria-label="Timer controls">
          {isIdle && (
            <Button
              variant="timer"
              size="timer"
              onClick={startTimer}
              className="min-w-[200px]"
              aria-label="Start timer"
            >
              <Play className="h-5 w-5" aria-hidden="true" />
              START
            </Button>
          )}

          {isRunning && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={pauseTimer}
                aria-label="Pause timer"
              >
                <Pause className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="timer"
                size="timer"
                onClick={stopTimer}
                disabled={isAdding}
                className="min-w-[200px]"
                aria-label={isAdding ? "Saving time entry" : "Stop timer and save"}
              >
                <Square className="h-5 w-5" aria-hidden="true" />
                {isAdding ? "SAVING..." : "STOP"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCancelDialog(true)}
                title="Cancel timer (Esc)"
                aria-label="Cancel timer without saving"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          )}

          {isPaused && (
            <>
              <Button
                variant="timer"
                size="timer"
                onClick={resumeTimer}
                className="min-w-[200px]"
                aria-label="Resume timer"
              >
                <Play className="h-5 w-5" aria-hidden="true" />
                RESUME
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={stopTimer}
                title="Stop and save"
                aria-label="Stop timer and save entry"
              >
                <Square className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCancelDialog(true)}
                title="Cancel timer (Esc)"
                aria-label="Cancel timer without saving"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Manual Entry Section */}
      <div className="mt-8 pt-8 border-t">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" role="heading" aria-level={2}>Manual Entry</h2>
          <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" aria-label="Open dialog to add manual time entry">
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                Add Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" aria-labelledby="manual-entry-title" aria-describedby="manual-entry-description">
              <DialogHeader>
                <DialogTitle id="manual-entry-title">Add Manual Time Entry</DialogTitle>
                <DialogDescription id="manual-entry-description">
                  Add a time entry without using the timer
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-project">Project *</Label>
                  <Select value={manualProject} onValueChange={setManualProject}>
                    <SelectTrigger id="manual-project">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingProjects ? (
                        <SelectItem value="loading" disabled>
                          Loading projects...
                        </SelectItem>
                      ) : (
                        projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: project.color }}
                              />
                              <span>{project.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-description">Description</Label>
                  <Input
                    id="manual-description"
                    placeholder="What did you work on?"
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Select 
                    value="" 
                    onValueChange={(tagId) => {
                      const tag = tags.find(t => t.id === tagId);
                      if (tag && !manualTags.includes(tag.name)) {
                        setManualTags([...manualTags, tag.name]);
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
                  
                  {manualTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {manualTags.map((tag) => {
                        const tagData = tags.find(t => t.name === tag);
                        return (
                          <Badge 
                            key={tag} 
                            variant="secondary"
                            className="flex items-center gap-1"
                            style={tagData ? { backgroundColor: tagData.color + '20', color: tagData.color } : {}}
                            role="group"
                            aria-label={`Tag: ${tag}`}
                          >
                            {tag}
                            <button
                              onClick={() => setManualTags(manualTags.filter(t => t !== tag))}
                              className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                              aria-label={`Remove tag ${tag}`}
                            >
                              <XIcon className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Duration *</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Hours"
                        value={manualHours}
                        onChange={(e) => setManualHours(e.target.value)}
                      />
                    </div>
                    <span className="text-muted-foreground">:</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="Minutes"
                        value={manualMinutes}
                        onChange={(e) => setManualMinutes(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter hours and minutes (e.g., 2 hours 30 minutes)
                  </p>
                </div>

                {(settings.userMode === 'freelancer' || settings.userMode === 'team') && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="manual-billable" className="text-sm font-medium cursor-pointer">
                        Billable
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Mark this time entry as billable to client
                      </p>
                    </div>
                    <Switch
                      id="manual-billable"
                      checked={manualIsBillable}
                      onCheckedChange={setManualIsBillable}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2" role="group" aria-label="Manual entry form actions">
                <Button
                  variant="outline"
                  onClick={() => setIsManualDialogOpen(false)}
                  aria-label="Cancel and close manual entry dialog"
                >
                  Cancel
                </Button>
                <Button
                  onClick={addManualEntry}
                  disabled={isAdding}
                  aria-label={isAdding ? "Adding manual time entry" : "Add manual time entry"}
                >
                  <Clock className="h-4 w-4 mr-2" aria-hidden="true" />
                  {isAdding ? "Adding..." : "Add Entry"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Add time entries manually for past work or when you forgot to start the timer.
        </p>
      </div>

      <DeleteConfirmationDialog
        open={showCancelDialog}
        title="Cancel timer"
        description="Are you sure you want to cancel this timer? Time will not be saved."
        onConfirm={cancelTimer}
        onCancel={() => setShowCancelDialog(false)}
      />
    </div>
  );
}
