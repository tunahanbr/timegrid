import { useState, useMemo } from "react";
import { formatDurationShort, formatDate } from "@/lib/utils-time";
import { Trash2, Loader2, AlertCircle, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FilterBar, FilterState } from "@/components/FilterBar";
import { parseISO } from "date-fns";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useProjects } from "@/hooks/useProjects";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { TimeEntry } from "@/lib/supabase-storage";

export default function EntriesPage() {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { from: undefined, to: undefined },
    projectIds: [],
    tags: [],
  });

  // Use Supabase hooks
  const { entries, isLoading: isLoadingEntries, error: entriesError, deleteEntry, isDeleting } = useTimeEntries();
  const { projects, isLoading: isLoadingProjects } = useProjects();

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

  const isDatabaseError = entriesError && (entriesError.message?.includes('404') || (entriesError as any).code === 'PGRST116');
  const isLoading = isLoadingEntries || isLoadingProjects;

  return (
    <div className="container mx-auto px-8 py-8">
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
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Time Entries</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isLoading ? "Loading..." : (
                <>
                  {filteredEntries.length} {filteredEntries.length !== entries.length && `of ${entries.length}`} entries
                  {filteredEntries.length > 0 && (
                    <span className="ml-2 font-mono">
                      • Total: {formatDurationShort(totalFiltered)}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
          {filteredEntries.length > 0 && !isLoading && (
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
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
    </div>
  );
}
