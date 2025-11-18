import { useMemo, useState } from "react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useTags } from "@/hooks/useTags";
import { formatDurationShort } from "@/lib/utils-time";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Download,
  Calendar as CalendarIcon,
  TrendingUp,
  Clock,
  DollarSign,
  AlertCircle,
  BarChart3,
  Filter,
} from "lucide-react";
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";
import { cn } from "@/lib/utils";

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

type GroupBy = "day" | "week" | "month" | "project" | "client" | "tag";
type ChartType = "line" | "bar" | "area" | "pie";

export default function ReportsPage() {
  const { entries, isLoading: entriesLoading, error: entriesError } = useTimeEntries();
  const { projects, isLoading: projectsLoading } = useProjects();
  const { clients, isLoading: clientsLoading } = useClients();
  const { tags, isLoading: tagsLoading } = useTags();

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Filter states
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [chartType, setChartType] = useState<ChartType>("line");

  const isLoading = entriesLoading || projectsLoading || clientsLoading || tagsLoading;

  // Filter entries based on selections
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const entryDate = parseISO(entry.date);
      
      // Date range filter
      if (dateRange.from && entryDate < dateRange.from) return false;
      if (dateRange.to && entryDate > dateRange.to) return false;

      // Project filter
      if (selectedProjects.length > 0 && !selectedProjects.includes(entry.projectId)) return false;

      // Client filter
      if (selectedClients.length > 0) {
        const project = projects.find((p) => p.id === entry.projectId);
        if (!project?.clientId || !selectedClients.includes(project.clientId)) return false;
      }

      // Tag filter
      if (selectedTags.length > 0) {
        const hasTag = entry.tags?.some((tag) => selectedTags.includes(tag));
        if (!hasTag) return false;
      }

      return true;
    });
  }, [entries, dateRange, selectedProjects, selectedClients, selectedTags, projects]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    const totalTime = filteredEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const totalEntries = filteredEntries.length;
    const uniqueDays = new Set(filteredEntries.map((e) => e.date)).size;
    const avgPerDay = uniqueDays > 0 ? totalTime / uniqueDays : 0;

    // Calculate billable hours and revenue
    let billableTime = 0;
    let totalRevenue = 0;

    filteredEntries.forEach((entry) => {
      const project = projects.find((p) => p.id === entry.projectId);
      if (project?.hourlyRate) {
        billableTime += entry.duration;
        totalRevenue += (entry.duration / 3600) * project.hourlyRate;
      }
    });

    return {
      totalTime,
      totalEntries,
      avgPerDay,
      billableTime,
      totalRevenue,
      billableHours: billableTime / 3600,
    };
  }, [filteredEntries, projects]);

  // Time series data
  const timeSeriesData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayEntries = filteredEntries.filter((e) => e.date === dayStr);
      const dayTotal = dayEntries.reduce((sum, e) => sum + e.duration, 0);
      
      let billableTime = 0;
      let revenue = 0;
      
      dayEntries.forEach((entry) => {
        const project = projects.find((p) => p.id === entry.projectId);
        if (project?.hourlyRate) {
          billableTime += entry.duration;
          revenue += (entry.duration / 3600) * project.hourlyRate;
        }
      });

      return {
        date: format(day, "MMM d"),
        fullDate: dayStr,
        hours: Math.round((dayTotal / 3600) * 100) / 100,
        billableHours: Math.round((billableTime / 3600) * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        entries: dayEntries.length,
      };
    });
  }, [filteredEntries, dateRange, projects]);

  // Project breakdown
  const projectBreakdown = useMemo(() => {
    const projectMap = new Map<string, { name: string; time: number; revenue: number; color: string }>();

    filteredEntries.forEach((entry) => {
      const project = projects.find((p) => p.id === entry.projectId);
      if (project) {
        const existing = projectMap.get(project.id) || {
          name: project.name,
          time: 0,
          revenue: 0,
          color: project.color,
        };
        const revenue = project.hourlyRate ? (entry.duration / 3600) * project.hourlyRate : 0;
        projectMap.set(project.id, {
          ...existing,
          time: existing.time + entry.duration,
          revenue: existing.revenue + revenue,
        });
      }
    });

    return Array.from(projectMap.values())
      .map((item) => ({
        ...item,
        hours: Math.round((item.time / 3600) * 100) / 100,
        percentage: stats.totalTime > 0 ? Math.round((item.time / stats.totalTime) * 100) : 0,
      }))
      .sort((a, b) => b.time - a.time);
  }, [filteredEntries, projects, stats.totalTime]);

  // Client breakdown
  const clientBreakdown = useMemo(() => {
    const clientMap = new Map<string, { name: string; time: number; revenue: number }>();

    filteredEntries.forEach((entry) => {
      const project = projects.find((p) => p.id === entry.projectId);
      if (project?.clientId) {
        const client = clients.find((c) => c.id === project.clientId);
        if (client) {
          const existing = clientMap.get(client.id) || { name: client.name, time: 0, revenue: 0 };
          const revenue = project.hourlyRate ? (entry.duration / 3600) * project.hourlyRate : 0;
          clientMap.set(client.id, {
            ...existing,
            time: existing.time + entry.duration,
            revenue: existing.revenue + revenue,
          });
        }
      }
    });

    return Array.from(clientMap.values())
      .map((item) => ({
        ...item,
        hours: Math.round((item.time / 3600) * 100) / 100,
        percentage: stats.totalTime > 0 ? Math.round((item.time / stats.totalTime) * 100) : 0,
      }))
      .sort((a, b) => b.time - a.time);
  }, [filteredEntries, projects, clients, stats.totalTime]);

  // Tag breakdown
  const tagBreakdown = useMemo(() => {
    const tagMap = new Map<string, { name: string; time: number }>();

    filteredEntries.forEach((entry) => {
      entry.tags?.forEach((tagId) => {
        const tag = tags.find((t) => t.id === tagId);
        if (tag) {
          const existing = tagMap.get(tag.id) || { name: tag.name, time: 0 };
          tagMap.set(tag.id, { ...existing, time: existing.time + entry.duration });
        }
      });
    });

    return Array.from(tagMap.values())
      .map((item) => ({
        ...item,
        hours: Math.round((item.time / 3600) * 100) / 100,
        percentage: stats.totalTime > 0 ? Math.round((item.time / stats.totalTime) * 100) : 0,
      }))
      .sort((a, b) => b.time - a.time);
  }, [filteredEntries, tags, stats.totalTime]);

  // Export to CSV
  const exportToCSV = () => {
    const csvRows = [
      ["Date", "Project", "Client", "Description", "Tags", "Duration (hours)", "Revenue"],
    ];

    filteredEntries.forEach((entry) => {
      const project = projects.find((p) => p.id === entry.projectId);
      const client = project?.clientId ? clients.find((c) => c.id === project.clientId) : null;
      const tagNames = entry.tags?.map((tagId) => tags.find((t) => t.id === tagId)?.name).filter(Boolean).join(", ") || "";
      const hours = (entry.duration / 3600).toFixed(2);
      const revenue = project?.hourlyRate ? ((entry.duration / 3600) * project.hourlyRate).toFixed(2) : "0";

      csvRows.push([
        entry.date,
        project?.name || "",
        client?.name || "",
        entry.description || "",
        tagNames,
        hours,
        revenue,
      ]);
    });

    const csvContent = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `time-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Quick date range presets
  const setPresetRange = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case "today":
        setDateRange({ from: now, to: now });
        break;
      case "yesterday":
        const yesterday = subDays(now, 1);
        setDateRange({ from: yesterday, to: yesterday });
        break;
      case "week":
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case "month":
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case "this-month":
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case "year":
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        break;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-3 rounded-md shadow-lg">
          <p className="font-medium mb-1">{payload[0].payload.date || payload[0].payload.name}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: item.color }}>
              {item.name}: {item.name.includes("Revenue") ? `$${item.value}` : `${item.value}h`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-8 py-8">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Error state
  if (entriesError) {
    return (
      <div className="container mx-auto px-8 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{entriesError?.message || "Failed to load reports data"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Advanced Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Detailed analytics with custom date ranges and filters
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "MMM d, yyyy") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "MMM d, yyyy") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="ghost" onClick={() => setPresetRange("today")}>
                  Today
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPresetRange("week")}>
                  7 Days
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPresetRange("month")}>
                  30 Days
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPresetRange("this-month")}>
                  This Month
                </Button>
              </div>
            </div>

            {/* Project Filter */}
            <div className="space-y-2">
              <Label>Projects ({selectedProjects.length} selected)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {selectedProjects.length === 0 ? "All Projects" : `${selectedProjects.length} selected`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {projects.map((project) => (
                      <div key={project.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`project-${project.id}`}
                          checked={selectedProjects.includes(project.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProjects([...selectedProjects, project.id]);
                            } else {
                              setSelectedProjects(selectedProjects.filter((id) => id !== project.id));
                            }
                          }}
                        />
                        <label htmlFor={`project-${project.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                          {project.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedProjects.length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <Button size="sm" variant="ghost" className="w-full" onClick={() => setSelectedProjects([])}>
                        Clear Selection
                      </Button>
                    </>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Client Filter */}
            <div className="space-y-2">
              <Label>Clients ({selectedClients.length} selected)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {selectedClients.length === 0 ? "All Clients" : `${selectedClients.length} selected`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {clients.map((client) => (
                      <div key={client.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`client-${client.id}`}
                          checked={selectedClients.includes(client.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedClients([...selectedClients, client.id]);
                            } else {
                              setSelectedClients(selectedClients.filter((id) => id !== client.id));
                            }
                          }}
                        />
                        <label htmlFor={`client-${client.id}`} className="text-sm cursor-pointer">
                          {client.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedClients.length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <Button size="sm" variant="ghost" className="w-full" onClick={() => setSelectedClients([])}>
                        Clear Selection
                      </Button>
                    </>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {filteredEntries.length < entries.length && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Showing {filteredEntries.length} of {entries.length} entries based on current filters
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatDurationShort(stats.totalTime)}</div>
            <p className="text-xs text-muted-foreground mt-1">{(stats.totalTime / 3600).toFixed(1)} hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEntries}</div>
            <p className="text-xs text-muted-foreground mt-1">Time entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatDurationShort(stats.avgPerDay)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per active day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.billableHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground mt-1">{formatDurationShort(stats.billableTime)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">From billable work</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Tracking Over Time</CardTitle>
              <CardDescription>Daily breakdown with billable hours and revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" label={{ value: "Hours", angle: -90, position: "insideLeft" }} />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" label={{ value: "Revenue ($)", angle: 90, position: "insideRight" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="hours" fill="hsl(var(--primary))" fillOpacity={0.2} stroke="hsl(var(--primary))" name="Total Hours" />
                  <Bar yAxisId="left" dataKey="billableHours" fill="hsl(var(--chart-2))" name="Billable Hours" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Revenue" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Distribution</CardTitle>
                <CardDescription>Time breakdown by project</CardDescription>
              </CardHeader>
              <CardContent>
                {projectBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={projectBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name} (${entry.percentage}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="hours"
                      >
                        {projectBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">No project data</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>Time and revenue by project</CardDescription>
              </CardHeader>
              <CardContent>
                {projectBreakdown.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {projectBreakdown.map((project, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{project.name}</div>
                          <div className="text-sm text-muted-foreground">{project.hours}h • ${project.revenue.toFixed(2)}</div>
                        </div>
                        <div className="text-sm font-semibold">{project.percentage}%</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">No project data</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Breakdown</CardTitle>
              <CardDescription>Time and revenue by client</CardDescription>
            </CardHeader>
            <CardContent>
              {clientBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {clientBreakdown.map((client, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded hover:bg-muted/50">
                      <div className="flex-1">
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">{client.hours} hours tracked</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${client.revenue.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">{client.percentage}% of total</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No client data available. Link projects to clients to see client reports.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tag Analysis</CardTitle>
              <CardDescription>Time distribution by tag</CardDescription>
            </CardHeader>
            <CardContent>
              {tagBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tagBreakdown.map((tag, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="font-medium mb-1">{tag.name}</div>
                      <div className="text-2xl font-bold font-mono">{tag.hours}h</div>
                      <div className="text-sm text-muted-foreground">{tag.percentage}% of total time</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No tag data available. Add tags to your time entries to see tag analysis.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
