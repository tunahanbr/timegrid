import { useState } from 'react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useProjects } from '@/hooks/useProjects';
import { WeekCalendar } from '@/components/WeekCalendar';
import MonthCalendar from '@/components/MonthCalendar';
import YearCalendar from '@/components/YearCalendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function CalendarPage() {
  const { entries, isLoading: entriesLoading, error: entriesError } = useTimeEntries();
  const { projects, isLoading: projectsLoading, error: projectsError } = useProjects();
  const [view, setView] = useState<'day' | 'week' | 'workweek' | 'month' | 'year'>('week');

  if (entriesLoading || projectsLoading) {
    return (
      <div className="container mx-auto px-8 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (entriesError || projectsError) {
    return (
      <div className="container mx-auto px-8 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {entriesError?.message || projectsError?.message || 'Failed to load calendar data'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-sm text-muted-foreground">Manage your time visually</p>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">View</span>
            <Select value={view} onValueChange={(v: 'day' | 'week' | 'workweek' | 'month' | 'year') => setView(v)}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="workweek">Work Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{view === 'day' ? 'Day View' : view === 'week' ? 'Week View' : view === 'workweek' ? 'Work Week View' : view === 'month' ? 'Month View' : 'Year View'}</CardTitle>
          <CardDescription>Your time entries organized by {view}</CardDescription>
        </CardHeader>
        <CardContent>
          {view === 'month' ? (
            <MonthCalendar entries={entries || []} projects={projects || []} />
          ) : view === 'year' ? (
            <YearCalendar entries={entries || []} />
          ) : (
            <WeekCalendar 
              entries={entries || []} 
              projects={projects || []} 
              view={view === 'day' ? 'day' : view === 'workweek' ? 'workweek' : 'week'}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
