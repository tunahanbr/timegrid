import { Button } from "@/components/ui/button";
import { storage } from "@/lib/storage";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SettingsPage() {
  const handleExport = () => {
    storage.exportToCSV();
    toast.success("Data exported successfully");
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to delete all data? This cannot be undone.")) {
      storage.saveEntries([]);
      storage.saveProjects([]);
      storage.saveTimerState({
        isRunning: false,
        isPaused: false,
        startTime: null,
        elapsedSeconds: 0,
        currentProjectId: null,
        currentDescription: '',
      });
      toast.success("All data cleared");
      window.location.reload();
    }
  };

  return (
    <div className="container mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div className="p-6 border border-border rounded bg-surface">
          <h2 className="text-lg font-semibold mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Theme</div>
              <div className="text-sm text-muted-foreground">
                Switch between light and dark mode
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="p-6 border border-border rounded bg-surface">
          <h2 className="text-lg font-semibold mb-4">Data Management</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Export Data</div>
                <div className="text-sm text-muted-foreground">
                  Download all time entries as CSV
                </div>
              </div>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-destructive">Clear All Data</div>
                  <div className="text-sm text-muted-foreground">
                    Delete all entries, projects, and settings
                  </div>
                </div>
                <Button variant="destructive" onClick={handleClearData}>
                  <Trash2 className="h-4 w-4" />
                  Clear Data
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border border-border rounded bg-surface">
          <h2 className="text-lg font-semibold mb-2">About</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>TimeTrack - Minimalist Time Tracking</p>
            <p>Built with React, TypeScript, and Tailwind CSS</p>
            <p className="mt-4 text-xs">All data stored locally in your browser</p>
          </div>
        </div>
      </div>
    </div>
  );
}
