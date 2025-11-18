import { useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Project } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface FilterState {
  dateRange: DateRange;
  projectIds: string[];
  tags: string[];
}

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  projects: Project[];
  availableTags: string[];
}

export function FilterBar({ filters, onFiltersChange, projects, availableTags }: FilterBarProps) {
  const [dateRange, setDateRange] = useState<DateRange>(filters.dateRange);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    const newRange = range || { from: undefined, to: undefined };
    setDateRange(newRange);
    onFiltersChange({ ...filters, dateRange: newRange });
  };

  const handleProjectChange = (projectId: string) => {
    const newProjectIds = filters.projectIds.includes(projectId)
      ? filters.projectIds.filter((id) => id !== projectId)
      : [...filters.projectIds, projectId];
    onFiltersChange({ ...filters, projectIds: newProjectIds });
  };

  const handleTagChange = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const clearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    onFiltersChange({
      dateRange: { from: undefined, to: undefined },
      projectIds: [],
      tags: [],
    });
  };

  const hasActiveFilters =
    dateRange.from ||
    dateRange.to ||
    filters.projectIds.length > 0 ||
    filters.tags.length > 0;

  return (
    <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-lg border border-border" role="search" aria-label="Filter time entries">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateRange.from && "text-muted-foreground"
              )}
              aria-label={dateRange.from ? `Date range: ${format(dateRange.from, "LLL dd, y")}${dateRange.to ? ` to ${format(dateRange.to, "LLL dd, y")}` : ''}` : "Select date range"}
              aria-haspopup="dialog"
            >
              <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={handleDateRangeChange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Project Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline"
              aria-label={filters.projectIds.length > 0 ? `Filter by projects: ${filters.projectIds.length} selected` : "Filter by projects"}
              aria-haspopup="dialog"
            >
              Projects
              {filters.projectIds.length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5" aria-hidden="true">
                  {filters.projectIds.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start" role="dialog" aria-label="Select projects to filter">
            <div className="space-y-1" role="group">
              {projects.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2">No projects available</div>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectChange(project.id)}
                    className={cn(
                      "flex items-center gap-3 w-full p-2 rounded hover:bg-muted transition-colors text-left",
                      filters.projectIds.includes(project.id) && "bg-muted"
                    )}
                    role="checkbox"
                    aria-checked={filters.projectIds.includes(project.id)}
                    aria-label={`Filter by project: ${project.name}`}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                      aria-hidden="true"
                    />
                    <span className="text-sm flex-1">{project.name}</span>
                    {filters.projectIds.includes(project.id) && (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center" aria-hidden="true">
                        <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Tag Filter */}
        {availableTags.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline"
                aria-label={filters.tags.length > 0 ? `Filter by tags: ${filters.tags.length} selected` : "Filter by tags"}
                aria-haspopup="dialog"
              >
                Tags
                {filters.tags.length > 0 && (
                  <Badge variant="secondary" className="ml-2 px-1.5 py-0.5" aria-hidden="true">
                    {filters.tags.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start" role="dialog" aria-label="Select tags to filter">
              <div className="space-y-1" role="group">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagChange(tag)}
                    className={cn(
                      "flex items-center gap-2 w-full p-2 rounded hover:bg-muted transition-colors text-left",
                      filters.tags.includes(tag) && "bg-muted"
                    )}
                    role="checkbox"
                    aria-checked={filters.tags.includes(tag)}
                    aria-label={`Filter by tag: ${tag}`}
                  >
                    <span className="text-sm flex-1">#{tag}</span>
                    {filters.tags.includes(tag) && (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center" aria-hidden="true">
                        <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            aria-label="Clear all filters"
          >
            <X className="h-4 w-4 mr-1" aria-hidden="true" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap" role="status" aria-label="Active filters">
          {dateRange.from && (
            <Badge variant="secondary" className="gap-1" role="group" aria-label={`Date filter: ${dateRange.from && dateRange.to ? `${format(dateRange.from, "MMM d")} to ${format(dateRange.to, "MMM d")}` : format(dateRange.from, "MMM d, yyyy")}`}>
              {dateRange.from && dateRange.to
                ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`
                : format(dateRange.from, "MMM d, yyyy")}
              <button
                onClick={() => handleDateRangeChange(undefined)}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                aria-label="Remove date filter"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
          {filters.projectIds.map((projectId) => {
            const project = projects.find((p) => p.id === projectId);
            return project ? (
              <Badge key={projectId} variant="secondary" className="gap-1" role="group" aria-label={`Project filter: ${project.name}`}>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: project.color }}
                  aria-hidden="true"
                />
                {project.name}
                <button
                  onClick={() => handleProjectChange(projectId)}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                  aria-label={`Remove ${project.name} filter`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </Badge>
            ) : null;
          })}
          {filters.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1" role="group" aria-label={`Tag filter: ${tag}`}>
              #{tag}
              <button
                onClick={() => handleTagChange(tag)}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                aria-label={`Remove ${tag} filter`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
