import { useState, useEffect } from "react";
import { storage, TimeEntry } from "@/lib/storage";
import { formatDurationShort, formatDate } from "@/lib/utils-time";
import { Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function EntriesPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState(storage.getProjects());

  useEffect(() => {
    loadEntries();
    const interval = setInterval(loadEntries, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadEntries = () => {
    setEntries(storage.getEntries());
    setProjects(storage.getProjects());
  };

  const deleteEntry = (id: string) => {
    storage.deleteEntry(id);
    loadEntries();
  };

  const groupedEntries = entries.reduce((acc, entry) => {
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

  return (
    <div className="container mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Time Entries</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {entries.length} entries tracked
        </p>
      </div>

      {sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No entries yet</h3>
          <p className="text-muted-foreground">Start the timer to create your first entry</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((date) => {
            const dayEntries = groupedEntries[date];
            const dayTotal = getDayTotal(dayEntries);

            return (
              <div key={date} className="space-y-2">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h2 className="text-lg font-semibold">{formatDate(date)}</h2>
                  <span className="text-sm font-mono text-muted-foreground">
                    {formatDurationShort(dayTotal)}
                  </span>
                </div>

                <div className="space-y-1">
                  {dayEntries.map((entry, index) => {
                    const project = projects.find(p => p.id === entry.projectId);
                    
                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "group flex items-center gap-4 p-3 rounded hover:bg-surface transition-colors animate-slide-in"
                        )}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: project?.color || '#888' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {entry.description || "No description"}
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
                        <div className="font-mono text-sm flex-shrink-0">
                          {formatDurationShort(entry.duration)}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteEntry(entry.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
  );
}
