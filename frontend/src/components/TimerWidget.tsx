import { useEffect, useState } from "react";
import { Play, Pause, Square, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { storage, TimerState } from "@/lib/storage";
import { formatDuration } from "@/lib/utils-time";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/hooks/useProjects";
import { useTimeEntries } from "@/hooks/useTimeEntries";

// Check if we're running in Tauri
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

export function TimerWidget() {
  const [timerState, setTimerState] = useState<TimerState>(storage.getTimerState());
  const [currentTime, setCurrentTime] = useState(0);
  
  const { projects, isLoading: isLoadingProjects } = useProjects();
  const { addEntry } = useTimeEntries();

  const isIdle = !timerState.isRunning && !timerState.isPaused;
  const isRunning = timerState.isRunning && !timerState.isPaused;
  const isPaused = timerState.isPaused;

  // Menu bar updates centralized via tray-updater service

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (timerState.isRunning && !timerState.isPaused && timerState.startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - timerState.startTime!) / 1000);
        setCurrentTime(timerState.elapsedSeconds + elapsed);
      }, 1000);
    } else if (timerState.isPaused) {
      setCurrentTime(timerState.elapsedSeconds);
    }

    return () => clearInterval(interval);
  }, [timerState]);

  const startTimer = () => {
    if (!timerState.currentProjectId) {
      return;
    }

    const newState: TimerState = {
      isRunning: true,
      isPaused: false,
      startTime: Date.now(),
      elapsedSeconds: 0,
      currentProjectId: timerState.currentProjectId,
      currentDescription: "",
    };
    setTimerState(newState);
    storage.saveTimerState(newState);
  };

  const pauseTimer = () => {
    const newState: TimerState = {
      ...timerState,
      isPaused: true,
      elapsedSeconds: currentTime,
      startTime: null,
    };
    setTimerState(newState);
    storage.saveTimerState(newState);
  };

  const resumeTimer = () => {
    const newState: TimerState = {
      ...timerState,
      isPaused: false,
      startTime: Date.now(),
    };
    setTimerState(newState);
    storage.saveTimerState(newState);
  };

  const stopTimer = async () => {
    if (currentTime === 0) {
      return;
    }

    const entry = {
      projectId: timerState.currentProjectId!,
      description: timerState.currentDescription || "",
      duration: currentTime,
      date: new Date().toISOString().split('T')[0],
      tags: [],
    };

    try {
      await addEntry(entry);
      
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
      setCurrentTime(0);
      
      // Tray title resets via tray-updater observing storage
    } catch (error) {
      // Error handled silently
    }
  };

  const handleProjectChange = (projectId: string) => {
    const newState: TimerState = {
      ...timerState,
      currentProjectId: projectId,
    };
    setTimerState(newState);
    storage.saveTimerState(newState);
  };

  const handleDescriptionChange = (description: string) => {
    const newState: TimerState = {
      ...timerState,
      currentDescription: description,
    };
    setTimerState(newState);
    storage.saveTimerState(newState);
  };

  const selectedProject = projects?.find(p => p.id === timerState.currentProjectId);

  // Make body transparent and apply theme for widget window
  useEffect(() => {
    document.body.style.backgroundColor = 'transparent';
    
    // Apply theme from storage
    const savedTheme = storage.getTheme();
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    
    // Listen for theme changes from main window
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'timetrack_theme') {
        const newTheme = e.newValue as 'dark' | 'light';
        if (newTheme) {
          document.documentElement.classList.toggle('dark', newTheme === 'dark');
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      document.body.style.backgroundColor = '';
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Listen for timer state changes from other windows (sync)
  useEffect(() => {
    import('@/lib/timer-sync').then(({ onTimerStateChange }) => {
      const cleanup = onTimerStateChange((newState) => {
        setTimerState(newState);
      });
      
      return cleanup;
    });
  }, []);

  return (
    <div className="h-screen w-full bg-transparent p-2 flex flex-col">
      <div className="backdrop-blur-2xl bg-background/80 dark:bg-background/60 border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full">
        {/* Timer Display with Status Indicator */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-white/5 to-white/0">
          <div className="text-center">
            {/* Status Badge */}
            <div className="flex items-center justify-center gap-2 mb-3">
              {isRunning && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs font-medium uppercase tracking-wide">Running</span>
                </div>
              )}
              {isPaused && (
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <div className="w-2 h-2 bg-orange-600 dark:bg-orange-400 rounded-full" />
                  <span className="text-xs font-medium uppercase tracking-wide">Paused</span>
                </div>
              )}
              {isIdle && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs font-medium uppercase tracking-wide">Ready</span>
                </div>
              )}
            </div>
            
            {/* Timer */}
            <div className="text-6xl font-bold font-mono mb-3 tracking-tight">
              {formatDuration(currentTime)}
            </div>
            
            {/* Project Badge */}
            {selectedProject && (
              <div 
                className="text-sm font-medium px-4 py-1.5 rounded-full inline-flex items-center gap-2 backdrop-blur-sm"
                style={{ 
                  backgroundColor: selectedProject.color + '30',
                  color: selectedProject.color 
                }}
              >
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedProject.color }}
                />
                {selectedProject.name}
              </div>
            )}
          </div>
        </div>

        {/* Project Selector & Description */}
        <div className="px-4 pt-4 pb-3 border-t border-white/10 dark:border-white/5 space-y-3">
          <Select
            value={timerState.currentProjectId || ""}
            onValueChange={handleProjectChange}
            disabled={isRunning || isPaused}
          >
            <SelectTrigger className="w-full h-11 bg-white/10 dark:bg-white/5 backdrop-blur-sm border-white/20 dark:border-white/10">
              <SelectValue placeholder="Select project..." />
            </SelectTrigger>
            <SelectContent>
              {isLoadingProjects ? (
                <SelectItem value="loading" disabled>
                  Loading...
                </SelectItem>
              ) : projects && projects.length > 0 ? (
                projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </div>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No projects available
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          <Input
            type="text"
            placeholder="What are you working on?"
            value={timerState.currentDescription || ""}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            className="w-full h-11 bg-white/10 dark:bg-white/5 backdrop-blur-sm border-white/20 dark:border-white/10"
          />
        </div>

        {/* Visual Timer Controls */}
        <div className="px-4 pb-4">
          {isIdle && (
            <Button
              onClick={startTimer}
              disabled={!timerState.currentProjectId}
              size="lg"
              className="w-full h-12 text-base font-medium relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary-foreground/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <Play className="h-5 w-5 mr-2 fill-current" />
              Start Timer
            </Button>
          )}

          {isRunning && (
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={pauseTimer} 
                variant="outline" 
                size="lg" 
                className="h-12 flex-col gap-1"
              >
                <Pause className="h-5 w-5" />
                <span className="text-xs">Pause</span>
              </Button>
              <Button 
                onClick={stopTimer} 
                variant="destructive" 
                size="lg"
                className="h-12 flex-col gap-1"
              >
                <Square className="h-5 w-5 fill-current" />
                <span className="text-xs">Stop & Save</span>
              </Button>
            </div>
          )}

          {isPaused && (
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={resumeTimer} 
                size="lg"
                className="h-12 flex-col gap-1"
              >
                <Play className="h-5 w-5 fill-current" />
                <span className="text-xs">Resume</span>
              </Button>
              <Button 
                onClick={stopTimer} 
                variant="destructive" 
                size="lg"
                className="h-12 flex-col gap-1"
              >
                <Square className="h-5 w-5 fill-current" />
                <span className="text-xs">Stop & Save</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
