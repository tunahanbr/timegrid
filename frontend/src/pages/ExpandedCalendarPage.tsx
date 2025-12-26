import { useState, useEffect } from 'react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useProjects } from '@/hooks/useProjects';
import { useCalendars } from '@/hooks/useCalendars';
import { WeekCalendar } from '@/components/WeekCalendar';
import MonthCalendar from '@/components/MonthCalendar';
import YearCalendar from '@/components/YearCalendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useExternalCalendarsContext } from '@/contexts/useExternalCalendarsContext';
import { startOfWeek } from 'date-fns';

export default function ExpandedCalendarPage() {
  const { entries, isLoading: entriesLoading, error: entriesError } = useTimeEntries();
  const { projects, isLoading: projectsLoading, error: projectsError } = useProjects();
  const { calendars, isLoading: calendarsLoading } = useCalendars();
  const { icalCalendars } = useExternalCalendarsContext();
  const [view, setView] = useState<'day' | 'week' | 'workweek' | 'month' | 'year'>('week');
  const [enabledCalendars, setEnabledCalendars] = useState<Set<string>>(new Set());
  const [enabledIcalCalendars, setEnabledIcalCalendars] = useState<Set<string>>(new Set());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));

  // Initialize enabled calendars when calendars load
  useEffect(() => {
    if (calendars && calendars.length > 0 && enabledCalendars.size === 0) {
      setEnabledCalendars(new Set(calendars.map(c => c.id)));
    }
  }, [calendars]);

  // Initialize enabled iCal calendars when they load
  useEffect(() => {
    if (icalCalendars && icalCalendars.length > 0 && enabledIcalCalendars.size === 0) {
      setEnabledIcalCalendars(new Set(icalCalendars.map(c => c.id)));
    }
  }, [icalCalendars]);

  if (entriesLoading || projectsLoading) {
    return (
      <div className="w-screen h-screen flex flex-col bg-background">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (entriesError || projectsError) {
    return (
      <div className="w-screen h-screen flex flex-col p-4 bg-background">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {entriesError?.message || projectsError?.message || 'Failed to load calendar data'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const toggleCalendar = (calendarId: string) => {
    const newSet = new Set(enabledCalendars);
    if (newSet.has(calendarId)) {
      newSet.delete(calendarId);
    } else {
      newSet.add(calendarId);
    }
    setEnabledCalendars(newSet);
  };

  const toggleIcalCalendar = (calendarId: string) => {
    const newSet = new Set(enabledIcalCalendars);
    if (newSet.has(calendarId)) {
      newSet.delete(calendarId);
    } else {
      newSet.add(calendarId);
    }
    setEnabledIcalCalendars(newSet);
  };

  return (
    <div className="w-screen h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border flex flex-col bg-muted/30 px-6 py-4 overflow-y-auto flex-shrink-0">
        {/* Calendars Section */}
        {calendars && calendars.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Calendars</h3>
            <div className="space-y-2">
              {calendars.map((calendar) => (
                <div key={calendar.id} className="flex items-center gap-3 cursor-pointer hover:bg-background/50 p-2 rounded transition-colors">
                  <Checkbox 
                    checked={enabledCalendars.has(calendar.id)}
                    onCheckedChange={() => toggleCalendar(calendar.id)}
                  />
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: calendar.color || '#9CA3AF' }}
                  />
                  <label className="text-sm flex-1 cursor-pointer truncate">
                    {calendar.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Others Section */}
        {icalCalendars && icalCalendars.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Others</h3>
            <div className="space-y-2">
              {icalCalendars.map((calendar) => (
                <div key={calendar.id} className="flex items-center gap-3 cursor-pointer hover:bg-background/50 p-2 rounded transition-colors">
                  <Checkbox 
                    checked={enabledIcalCalendars.has(calendar.id)}
                    onCheckedChange={() => toggleIcalCalendar(calendar.id)}
                  />
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: calendar.color || '#9CA3AF' }}
                  />
                  <label className="text-sm flex-1 cursor-pointer truncate">
                    {calendar.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with close button, navigation, and view tabs */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-border flex-shrink-0">
          {/* Left: Week navigation (only for week/day views) */}
          <div className="flex items-center gap-2">
            {(view === 'week' || view === 'day' || view === 'workweek') && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (view === 'day') {
                      setWeekStart(new Date(weekStart.getTime() - 24 * 60 * 60 * 1000));
                    } else {
                      setWeekStart(new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000));
                    }
                  }}
                  aria-label={view === 'day' ? 'Previous day' : 'Previous week'}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (view === 'day') {
                      setWeekStart(new Date());
                    } else {
                      setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
                    }
                  }}
                  aria-label="Today"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (view === 'day') {
                      setWeekStart(new Date(weekStart.getTime() + 24 * 60 * 60 * 1000));
                    } else {
                      setWeekStart(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000));
                    }
                  }}
                  aria-label={view === 'day' ? 'Next day' : 'Next week'}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Center: View tabs */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={view === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setView('day');
                setWeekStart(new Date());
              }}
              className="px-3"
            >
              Day
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setView('week');
                setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
              }}
              className="px-3"
            >
              Week
            </Button>
            <Button
              variant={view === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('month')}
              className="px-3"
            >
              Month
            </Button>
            <Button
              variant={view === 'year' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('year')}
              className="px-3"
            >
              Year
            </Button>
          </div>

          {/* Right: Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.close()}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Content */}
        {view === 'month' ? (
          <MonthCalendar entries={entries || []} projects={projects || []} />
        ) : view === 'year' ? (
          <YearCalendar entries={entries || []} />
        ) : (
          <WeekCalendar 
            entries={entries || []} 
            projects={projects || []} 
            view={view === 'day' ? 'day' : view === 'workweek' ? 'workweek' : 'week'}
            isExpanded
            enabledCalendars={enabledCalendars}
            enabledIcalCalendars={enabledIcalCalendars}
            externalWeekStart={weekStart}
          />
        )}
      </div>
    </div>
  );
}
