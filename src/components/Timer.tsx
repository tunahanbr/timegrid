import { useEffect, useState } from "react";
import { Play, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storage, TimerState } from "@/lib/storage";
import { formatDuration, getTodayISO } from "@/lib/utils-time";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function Timer() {
  const [timerState, setTimerState] = useState<TimerState>(storage.getTimerState());
  const [currentTime, setCurrentTime] = useState(0);
  const [description, setDescription] = useState("");
  const projects = storage.getProjects();

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

  const startTimer = () => {
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

  const stopTimer = () => {
    if (currentTime < 1) {
      toast.error("Timer must run for at least 1 second");
      return;
    }

    storage.addEntry({
      projectId: timerState.currentProjectId!,
      description: timerState.currentDescription,
      tags: [],
      duration: currentTime,
      date: getTodayISO(),
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
    toast.success("Time entry saved");
  };

  const isIdle = !timerState.isRunning;
  const isRunning = timerState.isRunning && !timerState.isPaused;
  const isPaused = timerState.isRunning && timerState.isPaused;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
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
          disabled={timerState.isRunning}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select project" />
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

        <Input
          placeholder="What are you working on?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={timerState.isRunning}
          className="w-full"
        />

        <div className="flex items-center justify-center gap-4">
          {isIdle && (
            <Button
              variant="timer"
              size="timer"
              onClick={startTimer}
              className="min-w-[200px]"
            >
              <Play className="h-5 w-5" />
              START
            </Button>
          )}

          {isRunning && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={pauseTimer}
              >
                <Pause className="h-4 w-4" />
              </Button>
              <Button
                variant="timer"
                size="timer"
                onClick={stopTimer}
                className="min-w-[200px]"
              >
                <Square className="h-5 w-5" />
                STOP
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
              >
                <Play className="h-5 w-5" />
                RESUME
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={stopTimer}
              >
                <Square className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
