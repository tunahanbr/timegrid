import { useState, useEffect, useMemo } from "react";
import { storage, TimeEntry, Project } from "@/lib/storage";
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
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, TrendingUp, Folder } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from "date-fns";

export default function DashboardPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeRange, setTimeRange] = useState<"week" | "month">("week");

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    setEntries(storage.getEntries());
    setProjects(storage.getProjects());
  };

  // Calculate date ranges
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = subDays(today, 30);

  // Filter entries by time range
  const filteredEntries = useMemo(() => {
    const startDate = timeRange === "week" ? weekStart : monthStart;
    return entries.filter((entry) => {
      const entryDate = parseISO(entry.date);
      return entryDate >= startDate && entryDate <= today;
    });
  }, [entries, timeRange, weekStart, monthStart, today]);

  // Calculate total time
  const totalTime = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => sum + entry.duration, 0);
  }, [filteredEntries]);

  // Project breakdown data
  const projectData = useMemo(() => {
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

    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayEntries = filteredEntries.filter((e) => e.date === dayStr);
      const dayTotal = dayEntries.reduce((sum, e) => sum + e.duration, 0);

      return {
        date: format(day, timeRange === "week" ? "EEE" : "MMM d"),
        hours: Math.round((dayTotal / 3600) * 10) / 10,
        seconds: dayTotal,
      };
    });
  }, [filteredEntries, timeRange, weekStart, monthStart, today]);

  // Statistics
  const stats = useMemo(() => {
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-3 rounded-md shadow-lg">
          <p className="font-medium">{payload[0].payload.name || payload[0].payload.date}</p>
          <p className="text-sm text-muted-foreground">
            {formatDurationShort(payload[0].payload.seconds || payload[0].payload.time)}
          </p>
        </div>
      );
    }
    return null;
  };

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
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" label={{ value: "Hours", angle: -90, position: "insideLeft" }} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Project Distribution</CardTitle>
            <CardDescription>Time breakdown by project</CardDescription>
          </CardHeader>
          <CardContent>
            {projectData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={projectData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name} (${entry.hours}h)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="hours"
                  >
                    {projectData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No project data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Project Breakdown</CardTitle>
          <CardDescription>Detailed time by project</CardDescription>
        </CardHeader>
        <CardContent>
          {projectData.length > 0 ? (
            <div className="space-y-2">
              {projectData.map((project, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded hover:bg-muted/50 transition-colors">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                  <div className="flex-1 font-medium">{project.name}</div>
                  <div className="text-sm text-muted-foreground">{project.hours} hours</div>
                  <div className="font-mono font-semibold">{formatDurationShort(project.time)}</div>
                  <div className="text-sm text-muted-foreground w-16 text-right">
                    {Math.round((project.time / totalTime) * 100)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
