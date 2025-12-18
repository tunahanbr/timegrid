import { useMemo } from "react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useProjects } from "@/hooks/useProjects";
import { useTags } from "@/hooks/useTags";
import { formatDurationShort } from "@/lib/utils-time";
import { TimelineChart } from "@/components/charts/TimelineChart";
import { ProjectDistributionChart } from "@/components/charts/ProjectDistributionChart";
import { TagBreakdownChart } from "@/components/charts/TagBreakdownChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, TrendingUp, Folder, AlertCircle, Hash, Zap } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, formatISO, isWithinInterval, getDay } from "date-fns";
import { useState } from "react";

export default function DashboardPage() {
  const { entries, isLoading: entriesLoading, error: entriesError } = useTimeEntries();
  const { projects, isLoading: projectsLoading, error: projectsError } = useProjects();
  const { tags, isLoading: tagsLoading } = useTags();
  const [timeRange, setTimeRange] = useState<"week" | "month">("week");

  // Loading state
  if (entriesLoading || projectsLoading || tagsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (entriesError || projectsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {entriesError?.message || projectsError?.message || "Failed to load dashboard data"}
        </AlertDescription>
      </Alert>
    );
  }

  // Calculate date ranges
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = subDays(today, 30);

  // Filter entries by time range
  const filteredEntries = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    const startDate = timeRange === "week" ? weekStart : monthStart;
    return entries.filter((entry) => {
      try {
        // Parse the date field which is now a full timestamp (start_time)
        const entryDate = parseISO(entry.date);
        return isWithinInterval(entryDate, { start: startDate, end: today });
      } catch (e) {
        console.warn('Failed to parse entry date:', entry.date);
        return false;
      }
    });
  }, [entries, timeRange, weekStart, monthStart, today]);

  // Calculate total time
  const totalTime = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => sum + entry.duration, 0);
  }, [filteredEntries]);

  // Project breakdown data
  const projectData = useMemo(() => {
    if (!filteredEntries || filteredEntries.length === 0 || !projects || projects.length === 0) {
      return [];
    }
    
    const projectMap = new Map<string, { name: string; time: number; color: string }>();

    filteredEntries.forEach((entry) => {
      const project = projects.find((p) => p.id === entry.projectId);
      if (project) {
        const existing = projectMap.get(project.id) || { name: project.name, time: 0, color: project.color };
        projectMap.set(project.id, { ...existing, time: existing.time + entry.duration });
      }
    });

    return Array.from(projectMap.values())
      .map((item) => ({
        name: item.name,
        hours: Math.round((item.time / 3600) * 10) / 10,
        time: item.time,
        color: item.color,
      }))
      .sort((a, b) => b.time - a.time);
  }, [filteredEntries, projects]);

  // Daily trend data
  const dailyData = useMemo(() => {
    const startDate = timeRange === "week" ? weekStart : monthStart;
    const days = eachDayOfInterval({ start: startDate, end: today });

    if (!filteredEntries || filteredEntries.length === 0) {
      return days.map((day) => ({
        date: format(day, timeRange === "week" ? "EEE" : "MMM d"),
        hours: 0,
        seconds: 0,
      }));
    }

    // Group entries by day for faster lookup
    const entriesByDay = new Map<string, typeof filteredEntries>();
    filteredEntries.forEach((entry) => {
      try {
        const dayStr = format(parseISO(entry.date), "yyyy-MM-dd");
        if (!entriesByDay.has(dayStr)) {
          entriesByDay.set(dayStr, []);
        }
        entriesByDay.get(dayStr)!.push(entry);
      } catch (e) {
        console.warn('Failed to group entry by day:', entry.date);
      }
    });

    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayEntries = entriesByDay.get(dayStr) || [];
      const dayTotal = dayEntries.reduce((sum, e) => sum + e.duration, 0);

      return {
        date: format(day, timeRange === "week" ? "EEE" : "MMM d"),
        hours: Math.round((dayTotal / 3600) * 10) / 10,
        seconds: dayTotal,
      };
    });
  }, [filteredEntries, timeRange, weekStart, monthStart, today]);

  // Tag breakdown data
  const tagData = useMemo(() => {
    if (!filteredEntries || filteredEntries.length === 0 || !tags || tags.length === 0) {
      return [];
    }
    
    const tagMap = new Map<string, { name: string; time: number; color: string }>();

    filteredEntries.forEach((entry) => {
      if (entry.tags && entry.tags.length > 0) {
        entry.tags.forEach((tagId) => {
          const tag = tags.find((t) => t.id === tagId);
          if (tag) {
            const existing = tagMap.get(tag.id) || { name: tag.name, time: 0, color: tag.color || '#888888' };
            tagMap.set(tag.id, { ...existing, time: existing.time + entry.duration });
          }
        });
      }
    });

    return Array.from(tagMap.values())
      .map((item) => ({
        name: item.name,
        hours: Math.round((item.time / 3600) * 10) / 10,
        percentage: totalTime > 0 ? Math.round((item.time / totalTime) * 100) : 0,
        time: item.time,
      }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 8);
  }, [filteredEntries, tags, totalTime]);

  // Day of week breakdown
  const dayOfWeekData = useMemo(() => {
    if (!filteredEntries || filteredEntries.length === 0) {
      return [];
    }

    const dayMap = new Map<number, number>();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    filteredEntries.forEach((entry) => {
      try {
        const dayOfWeek = getDay(parseISO(entry.date));
        dayMap.set(dayOfWeek, (dayMap.get(dayOfWeek) || 0) + entry.duration);
      } catch (e) {
        console.warn('Failed to parse entry date for day of week:', entry.date);
      }
    });

    return dayNames.map((name, index) => ({
      name,
      hours: Math.round(((dayMap.get(index) || 0) / 3600) * 10) / 10,
      time: dayMap.get(index) || 0,
    })).filter(d => d.hours > 0);
  }, [filteredEntries]);

  // Recent/longest entries
  const recentEntries = useMemo(() => {
    if (!filteredEntries || filteredEntries.length === 0 || !projects) {
      return [];
    }

    return [...filteredEntries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map((entry) => {
        const project = projects.find((p) => p.id === entry.projectId);
        return {
          ...entry,
          projectName: project?.name || 'Unknown',
          projectColor: project?.color || '#888888',
        };
      });
  }, [filteredEntries, projects]);

  // Statistics
  const stats = useMemo(() => {
    if (!filteredEntries || filteredEntries.length === 0) {
      return {
        totalEntries: 0,
        daysActive: 0,
        avgPerDay: 0,
        uniqueProjects: 0,
      };
    }
    
    const daysWithEntries = new Set(filteredEntries.map((e) => e.date)).size;
    const avgPerDay = daysWithEntries > 0 ? totalTime / daysWithEntries : 0;
    const uniqueProjects = new Set(filteredEntries.map((e) => e.projectId)).size;

    return {
      totalEntries: filteredEntries.length,
      daysActive: daysWithEntries,
      avgPerDay,
      uniqueProjects,
    };
  }, [filteredEntries, totalTime]);

  return (
    <div className="container mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-2">Overview of your time tracking</p>
      </div>

      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as "week" | "month")} className="mb-6">
        <TabsList>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">Last 30 Days</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatDurationShort(totalTime)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {timeRange === "week" ? "This week" : "Last 30 days"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatDurationShort(stats.avgPerDay)}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {stats.daysActive} active days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Entries</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEntries}</div>
            <p className="text-xs text-muted-foreground mt-1">Total entries tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">Projects with time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Time Trend</CardTitle>
            <CardDescription>Daily time tracked over {timeRange === "week" ? "this week" : "the last 30 days"}</CardDescription>
          </CardHeader>
          <CardContent>
            <TimelineChart 
              data={dailyData.map((d) => ({
                date: d.date,
                hours: d.hours,
                billableHours: 0,
                revenue: 0,
              }))}
            />
          </CardContent>
        </Card>

        {/* Project Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Project Distribution</CardTitle>
            <CardDescription>Time breakdown by project</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectDistributionChart 
              data={projectData.map((p) => ({
                name: p.name,
                hours: p.hours,
                percentage: totalTime > 0 ? Math.round((p.time / totalTime) * 100) : 0,
                color: p.color,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Day of Week Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Activity by Day of Week
            </CardTitle>
            <CardDescription>Your most productive days</CardDescription>
          </CardHeader>
          <CardContent>
            {dayOfWeekData.length > 0 ? (
              <div className="space-y-3">
                {dayOfWeekData.map((day) => {
                  const maxHours = Math.max(...dayOfWeekData.map((d) => d.hours));
                  const percentage = maxHours > 0 ? (day.hours / maxHours) * 100 : 0;
                  return (
                    <div key={day.name} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-12">{day.name}</span>
                      <div className="flex-1 h-6 bg-muted rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.max(percentage, 2)}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-16 text-right tabular-nums">
                        {day.hours.toFixed(1)}h
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No activity data</div>
            )}
          </CardContent>
        </Card>

        {/* Tag Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Top Tags
            </CardTitle>
            <CardDescription>Most used tags this period</CardDescription>
          </CardHeader>
          <CardContent>
            {tagData.length > 0 ? (
              <TagBreakdownChart data={tagData} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">No tags used</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Longest Sessions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Longest Sessions
          </CardTitle>
          <CardDescription>Your most focused work periods this {timeRange === "week" ? "week" : "month"}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEntries.length > 0 ? (
            <div className="space-y-3">
              {recentEntries.map((entry, index) => (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div
                    className="w-1 h-8 rounded-full"
                    style={{ backgroundColor: entry.projectColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{entry.description || 'No description'}</p>
                    <p className="text-sm text-muted-foreground truncate">{entry.projectName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold">{formatDurationShort(entry.duration)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(entry.date), 'MMM d')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No entries found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
