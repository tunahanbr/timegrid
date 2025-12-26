import { useMemo, useState, useRef, useEffect } from 'react';
import { TimeEntry, Project } from '@/lib/supabase-storage';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, eachDayOfInterval as eachDay, parseISO, isWithinInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { CreateEntryModal } from './CreateEntryModal';
import { EditEntryModal } from './EditEntryModal';
import { useExternalEvents } from '@/hooks/useExternalEvents';
import type { ExternalEvent } from '@/lib/external-events';
import { useCalendars } from '@/hooks/useCalendars';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExternalCalendarsContext } from '@/contexts/useExternalCalendarsContext';

interface WeekCalendarProps {
  entries: TimeEntry[];
  projects: Project[];
  view?: 'week' | 'workweek' | 'day';
  isExpanded?: boolean;
  enabledCalendars?: Set<string>;
  enabledIcalCalendars?: Set<string>;
  externalWeekStart?: Date;
}

const HOUR_START = 0; // 12 AM (midnight)
const HOUR_END = 24; // 12 AM (next day)
const HOURS_DISPLAY = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

interface TimeBlock {
  entry: TimeEntry;
  project: Project | undefined;
  topPercent: number;
  heightPercent: number;
  startHour: number;
  startMinute: number;
}

export function WeekCalendar({ entries, projects, view = 'week', isExpanded = false, enabledCalendars: propEnabledCalendars, enabledIcalCalendars: propEnabledIcalCalendars, externalWeekStart }: WeekCalendarProps) {
  const [localWeekStart, setLocalWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const weekStart = isExpanded && externalWeekStart ? externalWeekStart : localWeekStart;
  const setWeekStart = isExpanded ? () => {} : setLocalWeekStart;
  const { settings } = useUserSettings();
  const { deleteEntry } = useTimeEntries();
  const timeFormat = (settings?.preferences?.timeFormat as '12h' | '24h') || '12h';

  // Drag-to-create state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: Date; hour: number; minute: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: Date; hour: number; minute: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [ctxType, setCtxType] = useState<'block' | 'grid' | null>(null);
  const [ctxEntry, setCtxEntry] = useState<TimeEntry | null>(null);
  const [ctxCreateAnchor, setCtxCreateAnchor] = useState<{ day: Date; hour: number; minute: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const suppressNextMouseUp = useRef(false);
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
  const { calendars, isLoading: calendarsLoading } = useCalendars();
  const [localEnabledCalendars, setLocalEnabledCalendars] = useState<Set<string>>(new Set());
  const [createCalendarId, setCreateCalendarId] = useState<string>('none');
  // Use prop if provided (for expanded view), otherwise use local state
  const enabledCalendars = propEnabledCalendars !== undefined ? propEnabledCalendars : localEnabledCalendars;
  const setEnabledCalendars = propEnabledCalendars !== undefined ? () => {} : setLocalEnabledCalendars;
  const { icalCalendars } = useExternalCalendarsContext();
  const [localEnabledIcalCalendars, setLocalEnabledIcalCalendars] = useState<Set<string>>(new Set());
  // Use prop if provided (for expanded view), otherwise use local state
  const enabledIcalCalendars = propEnabledIcalCalendars !== undefined ? propEnabledIcalCalendars : localEnabledIcalCalendars;
  const setEnabledIcalCalendars = propEnabledIcalCalendars !== undefined ? () => {} : setLocalEnabledIcalCalendars;

  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 0 }), [weekStart]);
  const { getInRange } = useExternalEvents();
  const externalEventsInWeek: ExternalEvent[] = useMemo(() => {
    const allEvents = getInRange({ start: weekStart, end: weekEnd });
    // Filter external events based on enabled iCal calendars
    return allEvents.filter((ev) => {
      if (!ev.calendarId) return true; // Show events without a calendar ID
      return enabledIcalCalendars.has(ev.calendarId);
    });
  }, [getInRange, weekStart, weekEnd, enabledIcalCalendars]);

  // Initialize calendar filters and default selection when calendars change
  useEffect(() => {
    if (!calendars || calendars.length === 0) return;
    setEnabledCalendars((prev) => {
      if (prev.size === 0) return new Set(calendars.map((c) => c.id));
      return prev;
    });
    setCreateCalendarId((prev) => (prev === 'none' ? calendars[0].id : prev));
  }, [calendars]);

  // Initialize iCal calendar filters when iCal calendars change
  useEffect(() => {
    if (!icalCalendars || icalCalendars.length === 0) return;
    setEnabledIcalCalendars((prev) => {
      if (prev.size === 0) return new Set(icalCalendars.map((c) => c.id));
      return prev;
    });
  }, [icalCalendars]);

  const toggleCalendar = (id: string) => {
    setEnabledCalendars((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleIcalCalendar = (id: string) => {
    setEnabledIcalCalendars((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredEntries = useMemo(() => {
    if (!calendars || calendars.length === 0) return entries;
    return entries.filter((entry) => {
      // Always show entries without a calendar
      if (!entry.calendarId) return true;
      // Check if the entry's calendar is enabled
      return enabledCalendars.has(entry.calendarId);
    });
  }, [entries, calendars, enabledCalendars]);

  // Layout helpers for overlapping items
  const pxPerMinute = 80 / 60; // 80px per hour
  type RenderItem = {
    kind: 'local' | 'external';
    id: string;
    startMin: number; // minutes since day start
    endMin: number;
    topPx: number;
    heightPx: number;
    col: number;
    cols: number;
    color?: string;
    // payloads
    local?: TimeBlock;
    external?: ExternalEvent;
  };

  function assignColumns(items: Omit<RenderItem, 'col' | 'cols' | 'topPx' | 'heightPx'>[]): RenderItem[] {
    // Group into clusters by overlap
    const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    const result: RenderItem[] = [];
    let i = 0;
    while (i < sorted.length) {
      const cluster: typeof items = [];
      let clusterEnd = -1;
      let j = i;
      while (j < sorted.length) {
        const it = sorted[j];
        if (cluster.length === 0) {
          cluster.push(it);
          clusterEnd = it.endMin;
        } else {
          // overlaps cluster if starts before current cluster end
          if (it.startMin < clusterEnd) {
            cluster.push(it);
            if (it.endMin > clusterEnd) clusterEnd = it.endMin;
          } else {
            break;
          }
        }
        j++;
      }

      // Assign columns within this cluster using interval partitioning
      const colEnds: number[] = []; // endMin per column
      const assigned: RenderItem[] = [];
      for (const it of cluster) {
        let colIndex = 0;
        for (; colIndex < colEnds.length; colIndex++) {
          if (colEnds[colIndex] <= it.startMin) break;
        }
        if (colIndex === colEnds.length) {
          colEnds.push(it.endMin);
        } else {
          colEnds[colIndex] = it.endMin;
        }
        assigned.push({
          ...it,
          col: colIndex,
          cols: 0, // fill after we know total
          topPx: it.startMin * pxPerMinute,
          heightPx: Math.max(16, (it.endMin - it.startMin) * pxPerMinute),
        });
      }
      const totalCols = colEnds.length;
      for (const a of assigned) {
        a.cols = totalCols;
        result.push(a);
      }

      i = j;
    }
    return result;
  }

  // Refresh current time every minute to keep the indicator updated
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  
  const days = useMemo(() => {
    const all = eachDayOfInterval({ start: weekStart, end: weekEnd });
    if (view === 'day') return [weekStart];
    if (view === 'workweek') return all.filter(d => {
      const w = d.getDay();
      return w !== 0 && w !== 6; // exclude Sunday(0) and Saturday(6)
    });
    return all; // week
  }, [weekStart, weekEnd, view]);

  // Group entries by day and calculate positions
  const entriesByDay = useMemo(() => {
    const result: { [key: string]: TimeBlock[] } = {};

    days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      result[dayKey] = [];
    });

    filteredEntries.forEach(entry => {
      try {
        // Determine base start time
        const baseStart = entry.startTime ? parseISO(entry.startTime) : parseISO(entry.date);
        const project = projects.find(p => p.id === entry.projectId);

        // Build occurrences for this week
        const occurrences: Date[] = [];
        const freq = (entry.recurrenceRule || '').match(/FREQ=(DAILY|WEEKLY|MONTHLY)/)?.[1];

        if (entry.isRecurring && freq) {
          if (freq === 'DAILY') {
            eachDay({ start: weekStart, end: weekEnd }).forEach(d => {
              const dt = new Date(d);
              dt.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
              occurrences.push(dt);
            });
          } else if (freq === 'WEEKLY') {
            // find the day in this week that matches baseStart weekday
            eachDay({ start: weekStart, end: weekEnd }).forEach(d => {
              if (d.getDay() === baseStart.getDay()) {
                const dt = new Date(d);
                dt.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
                occurrences.push(dt);
              }
            });
          } else if (freq === 'MONTHLY') {
            // Show only if a day in this week has the same date-of-month
            eachDay({ start: weekStart, end: weekEnd }).forEach(d => {
              if (d.getDate() === baseStart.getDate()) {
                const dt = new Date(d);
                dt.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
                occurrences.push(dt);
              }
            });
          }
        } else {
          occurrences.push(baseStart);
        }

        occurrences.forEach(occ => {
          if (!isWithinInterval(occ, { start: weekStart, end: weekEnd })) return;
          
          const entryStart = occ;
          const entryEnd = new Date(occ.getTime() + entry.duration * 1000);
          
          // For each day in the week, check if entry overlaps
          days.forEach(day => {
            const dayStart = new Date(day);
            dayStart.setHours(HOUR_START, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(HOUR_END, 0, 0, 0);
            
            // Check if entry overlaps with this day
            if (entryStart < dayEnd && entryEnd > dayStart) {
              const dayKey = format(day, 'yyyy-MM-dd');
              
              // Calculate visible portion on this day
              const visibleStart = entryStart > dayStart ? entryStart : dayStart;
              const visibleEnd = entryEnd < dayEnd ? entryEnd : dayEnd;
              
              const startHour = visibleStart.getHours();
              const startMinute = visibleStart.getMinutes();
              
              const totalMinutesFromStart = (startHour - HOUR_START) * 60 + startMinute;
              const topPercent = (totalMinutesFromStart / ((HOUR_END - HOUR_START) * 60)) * 100;
              
              const visibleDurationMs = visibleEnd.getTime() - visibleStart.getTime();
              const durationMinutes = visibleDurationMs / (60 * 1000);
              const heightPercent = (durationMinutes / ((HOUR_END - HOUR_START) * 60)) * 100;
              
              if (startHour >= HOUR_START && startHour < HOUR_END) {
                // Create a shallow clone with occurrence date for time formatting
                const occEntry = { ...entry, date: visibleStart.toISOString(), startTime: visibleStart.toISOString() };
                result[dayKey].push({
                  entry: occEntry,
                  project: projects.find(p => p.id === entry.projectId),
                  topPercent: Math.max(0, topPercent),
                  heightPercent: Math.max(2, heightPercent),
                  startHour,
                  startMinute,
                });
              }
            }
          });
        });
      } catch (e) {
        // Skip invalid entry
      }
    });

    return result;
  }, [filteredEntries, projects, days, weekStart, weekEnd]);

  const handlePrevWeek = () => setWeekStart(view === 'day' ? subWeeks(weekStart, 0) && new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000) : subWeeks(weekStart, 1));
  const handleNextWeek = () => setWeekStart(view === 'day' ? addWeeks(weekStart, 0) && new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000) : addWeeks(weekStart, 1));

  // Helper to convert pixel position to hour:minute
  const pixelToTime = (pixel: number): { hour: number; minute: number } => {
    // Each hour = 80px, so each minute = 80/60 = 1.33px
    const totalMinutesFromStart = (pixel / 80) * 60;
    let hour = Math.floor(totalMinutesFromStart / 60) + HOUR_START;
    let minute = Math.round((totalMinutesFromStart % 60) / 15) * 15; // Snap to 15-min intervals

    // Handle minute overflow (can be 60 when rounded up)
    if (minute >= 60) {
      hour += 1;
      minute = 0;
    }

    // Allow hour to reach 24 (midnight of next day), but not beyond
    if (hour > HOUR_END) hour = HOUR_END;
    if (hour < HOUR_START) hour = HOUR_START;

    return { hour, minute };
  };

  // Handle mouse down on grid cell
  const handleMouseDown = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left click

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pixel = e.clientY - rect.top;
    const { hour, minute } = pixelToTime(pixel);

    const startDateTime = new Date(day);
    startDateTime.setHours(hour, minute, 0, 0);

    setDragStart({ day, hour, minute });
    setDragEnd({ day, hour, minute: minute + 15 }); // Default 15min block
    setIsDragging(true);
  };

  // Open context menu for a block
  const handleBlockContextMenu = (entry: TimeEntry, e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    suppressNextMouseUp.current = true;
    setCtxType('block');
    setCtxEntry(entry);
    setCtxCreateAnchor(null);
    setCtxPos({ x: e.clientX, y: e.clientY });
    setCtxOpen(true);
  };

  // Open context menu for grid
  const handleGridContextMenu = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    suppressNextMouseUp.current = true;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pixel = e.clientY - rect.top;
    const { hour, minute } = pixelToTime(pixel);
    setCtxType('grid');
    setCtxEntry(null);
    setCtxCreateAnchor({ day, hour, minute });
    setCtxPos({ x: e.clientX, y: e.clientY });
    setCtxOpen(true);
  };

  // Handle touch start on grid cell
  const handleTouchStart = (day: Date, e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return; // Only single touch

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pixel = e.touches[0].clientY - rect.top;
    const { hour, minute } = pixelToTime(pixel);

    const startDateTime = new Date(day);
    startDateTime.setHours(hour, minute, 0, 0);

    setDragStart({ day, hour, minute });
    setDragEnd({ day, hour, minute: minute + 15 }); // Default 15min block
    setIsDragging(true);
  };

  // Handle mouse move for drag preview
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart || !gridRef.current) return;

    // Find which day column the mouse is over
    const dayElements = gridRef.current.querySelectorAll('[data-day-column]');
    let targetDay = dragStart.day;
    
    for (const elem of Array.from(dayElements)) {
      const dayRect = elem.getBoundingClientRect();
      if (e.clientX >= dayRect.left && e.clientX <= dayRect.right) {
        const dayStr = elem.getAttribute('data-day-column');
        if (dayStr) {
          targetDay = parseISO(dayStr);
        }
        break;
      }
    }

    const rect = gridRef.current.getBoundingClientRect();
    const pixel = e.clientY - rect.top;
    const { hour, minute } = pixelToTime(pixel);

    // Allow hour to be 24 (midnight of next day)
    const effectiveHour = hour >= HOUR_START && hour <= HOUR_END ? hour : (hour > HOUR_END ? HOUR_END : HOUR_START);
    const effectiveMinute = effectiveHour === HOUR_END ? 0 : minute;

    const endDateTime = new Date(targetDay);
    endDateTime.setHours(effectiveHour, effectiveMinute, 0, 0);

    // Ensure end is after start
    const startDateTime = new Date(dragStart.day);
    startDateTime.setHours(dragStart.hour, dragStart.minute, 0, 0);

    if (endDateTime > startDateTime) {
      setDragEnd({ day: targetDay, hour: effectiveHour, minute: effectiveMinute });
    }
  };

  // Handle touch move for drag preview
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart || !gridRef.current || e.touches.length !== 1) return;

    // Find which day column the touch is over
    const dayElements = gridRef.current.querySelectorAll('[data-day-column]');
    let targetDay = dragStart.day;
    
    for (const elem of Array.from(dayElements)) {
      const dayRect = elem.getBoundingClientRect();
      if (e.touches[0].clientX >= dayRect.left && e.touches[0].clientX <= dayRect.right) {
        const dayStr = elem.getAttribute('data-day-column');
        if (dayStr) {
          targetDay = parseISO(dayStr);
        }
        break;
      }
    }

    const rect = gridRef.current.getBoundingClientRect();
    const pixel = e.touches[0].clientY - rect.top;
    const { hour, minute } = pixelToTime(pixel);

    // Allow hour to be 24 (midnight of next day)
    const effectiveHour = hour >= HOUR_START && hour <= HOUR_END ? hour : (hour > HOUR_END ? HOUR_END : HOUR_START);
    const effectiveMinute = effectiveHour === HOUR_END ? 0 : minute;

    const endDateTime = new Date(targetDay);
    endDateTime.setHours(effectiveHour, effectiveMinute, 0, 0);

    // Ensure end is after start
    const startDateTime = new Date(dragStart.day);
    startDateTime.setHours(dragStart.hour, dragStart.minute, 0, 0);

    if (endDateTime > startDateTime) {
      setDragEnd({ day: targetDay, hour: effectiveHour, minute: effectiveMinute });
    }
  };

  // Handle mouse up to show modal
  const handleMouseUp = () => {
    // If we just interacted with a control (e.g., delete button), skip modal
    if (suppressNextMouseUp.current) {
      suppressNextMouseUp.current = false;
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }
    if (!isDragging) {
      // Reset drag state in case of stale data
      setDragStart(null);
      setDragEnd(null);
      return;
    }
    
    if (!dragStart || !dragEnd) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const startDateTime = new Date(dragStart.day);
    startDateTime.setHours(dragStart.hour, dragStart.minute, 0, 0);

    const endDateTime = new Date(dragEnd.day);
    endDateTime.setHours(dragEnd.hour, dragEnd.minute, 0, 0);

    // Only create if duration is at least 15 minutes
    if (endDateTime.getTime() - startDateTime.getTime() >= 15 * 60 * 1000) {
      // Persist selection for modal before clearing drag state
      setSelectedStartTime(new Date(startDateTime));
      setSelectedEndTime(new Date(endDateTime));
      setModalOpen(true);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const modalStartTime = selectedStartTime;
  const modalEndTime = selectedEndTime;

  return (
    <TooltipProvider>
      <div className={isExpanded ? "h-full w-full flex flex-col" : "space-y-4"}>
        {!isExpanded && (
        <>
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevWeek}
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
              aria-label="Today"
            >
              {view === 'day' ? 'This Day' : 'Today'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextWeek}
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-muted-foreground ml-4">
              {view === 'day'
                ? `${format(weekStart, 'EEEE, MMM d, yyyy')}`
                : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/calendar/expanded', '_blank')}
            title="Open in expanded view"
            aria-label="Expand calendar to full screen"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar checkboxes and default selection */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground font-medium">Show calendars</span>
            {calendarsLoading && <span className="text-muted-foreground ml-2">Loading…</span>}
            {!calendarsLoading && (!calendars || calendars.length === 0) && (!icalCalendars || icalCalendars.length === 0) && (
              <span className="text-muted-foreground ml-2">No calendars yet. Create one in Settings.</span>
            )}
            {(calendars && calendars.length > 0 || icalCalendars && icalCalendars.length > 0) && (
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {/* Own calendars */}
                {calendars && calendars.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {calendars.map((cal) => {
                      const enabled = enabledCalendars.has(cal.id);
                      return (
                        <label key={cal.id} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => toggleCalendar(cal.id)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color || '#9CA3AF' }} />
                          <span className="truncate max-w-[140px] text-xs" title={cal.name}>{cal.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {/* Subscribed iCal calendars */}
                {icalCalendars && icalCalendars.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">|</span>
                    {icalCalendars.map((cal) => {
                      const enabled = enabledIcalCalendars.has(cal.id);
                      return (
                        <label key={cal.id} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => toggleIcalCalendar(cal.id)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color || '#9CA3AF' }} />
                          <span className="truncate max-w-[140px] text-xs font-italic" title={cal.name}>{cal.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto text-muted-foreground">
            <span className="text-xs">New entries</span>
            <Select value={createCalendarId} onValueChange={setCreateCalendarId}>
              <SelectTrigger className="h-8 w-48">
                <SelectValue placeholder="Choose calendar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No calendar</SelectItem>
                {(calendars || []).map((cal) => (
                  <SelectItem key={cal.id} value={cal.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color || '#9CA3AF' }} />
                      {cal.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        </>
        )}

        {/* Calendar Grid */}
        <div className={isExpanded ? "flex-1 overflow-hidden bg-background flex flex-col" : "border border-border rounded-lg overflow-hidden bg-background flex flex-col max-h-[calc(100vh-300px)]"}>
          {/* Day Headers - Sticky */}
          <div className={view === 'day' ? 'grid [grid-template-columns:120px_1fr] border-b border-border bg-background flex-shrink-0' : 'grid grid-cols-8 border-b border-border bg-background flex-shrink-0'}>
            <div className="col-span-1 p-4 border-r border-border bg-muted/30">
              <div className="text-xs font-semibold text-muted-foreground">Time</div>
            </div>
            {days.map((day) => {
              const dayName = format(day, 'EEE');
              const dayNum = format(day, 'd');
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

              return (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className={`col-span-1 p-4 border-r border-border text-center ${
                    isToday ? 'bg-primary/5' : 'bg-muted/30'
                  }`}
                >
                  <div className="text-xs font-semibold">{dayName}</div>
                  <div className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>
                    {dayNum}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Grid - Scrollable Container */}
          <div className={isExpanded ? "flex-1 overflow-y-auto scroll-hide pb-24" : "overflow-y-auto flex-1 scroll-hide pb-24"}>
            <div
              ref={gridRef}
              className={view === 'day' ? 'grid [grid-template-columns:120px_1fr] relative' : 'grid grid-cols-8 relative'}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
            {/* Time Column */}
            <div className="col-span-1 border-r border-border bg-muted/30 sticky left-0 z-10">
              {HOURS_DISPLAY.map((hour) => (
                <div
                  key={hour}
                  className="h-20 border-b border-border p-2 text-right"
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    {timeFormat === '24h' 
                      ? `${hour.toString().padStart(2, '0')}:00`
                      : `${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'}`
                    }
                  </div>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {days.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayEntries = entriesByDay[dayKey] || [];
              
              // Check if this day is involved in the drag (either start day, end day, or in between)
              let isDragDay = false;
              let dragPreviewTop = 0;
              let dragPreviewHeight = 0;
              
              if (isDragging && dragStart && dragEnd) {
                const dragStartDay = format(dragStart.day, 'yyyy-MM-dd');
                const dragEndDay = format(dragEnd.day, 'yyyy-MM-dd');
                const currentDay = dayKey;
                
                // Check if current day is the start day, end day, or in between
                if (dragStartDay === dragEndDay && currentDay === dragStartDay) {
                  // Single day drag
                  isDragDay = true;
                  dragPreviewTop = ((dragStart.hour - HOUR_START) * 60 + dragStart.minute) / 60 * 80;
                  dragPreviewHeight = Math.max(15, ((dragEnd.hour - HOUR_START) * 60 + dragEnd.minute) - ((dragStart.hour - HOUR_START) * 60 + dragStart.minute)) / 60 * 80;
                } else if (currentDay === dragStartDay) {
                  // Start day of multi-day drag
                  isDragDay = true;
                  dragPreviewTop = ((dragStart.hour - HOUR_START) * 60 + dragStart.minute) / 60 * 80;
                  dragPreviewHeight = ((HOUR_END - HOUR_START) * 60 - ((dragStart.hour - HOUR_START) * 60 + dragStart.minute)) / 60 * 80;
                } else if (currentDay === dragEndDay) {
                  // End day of multi-day drag
                  isDragDay = true;
                  dragPreviewTop = 0;
                  dragPreviewHeight = ((dragEnd.hour - HOUR_START) * 60 + dragEnd.minute) / 60 * 80;
                } else if (new Date(currentDay) > new Date(dragStartDay) && new Date(currentDay) < new Date(dragEndDay)) {
                  // Day in between start and end
                  isDragDay = true;
                  dragPreviewTop = 0;
                  dragPreviewHeight = (HOUR_END - HOUR_START) * 80;
                }
              }
              
              const isToday = format(day, 'yyyy-MM-dd') === format(currentTime, 'yyyy-MM-dd');
              const totalMinutes = (HOUR_END - HOUR_START) * 60;
              const minutesFromStart = isToday
                ? Math.min(
                    Math.max(0, (currentTime.getHours() - HOUR_START) * 60 + currentTime.getMinutes()),
                    totalMinutes
                  )
                : 0;
              const nowTopPercent = (minutesFromStart / totalMinutes) * 100;

              return (
                <div
                  key={dayKey}
                  data-day-column={dayKey}
                  className="col-span-1 border-r border-border relative cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => handleMouseDown(day, e)}
                  onTouchStart={(e) => handleTouchStart(day, e)}
                  onContextMenu={(e) => handleGridContextMenu(day, e)}
                >
                  {/* Hour dividers */}
                  {HOURS_DISPLAY.map((hour) => (
                    <div
                      key={`divider-${hour}`}
                      className="absolute left-0 right-0 h-20 border-b border-border/50"
                      style={{
                        top: `${((hour - HOUR_START) * 80).toString()}px`,
                      }}
                    />
                  ))}

                  {/* Drag preview block */}
                  {isDragDay && dragStart && dragEnd && (
                    <div
                      className="absolute left-1 right-1 rounded-md bg-primary/20 border-2 border-primary/50 p-1.5 pointer-events-none"
                      style={{
                        top: `${dragPreviewTop}px`,
                        height: `${dragPreviewHeight}px`,
                        minHeight: '24px',
                      }}
                    >
                      <div className="text-xs font-semibold text-primary">
                        {dragStart.hour.toString().padStart(2, '0')}:{dragStart.minute.toString().padStart(2, '0')} – {dragEnd.hour.toString().padStart(2, '0')}:{dragEnd.minute.toString().padStart(2, '0')}
                      </div>
                    </div>
                  )}

                  {/* Today past shading */}
                  {isToday && minutesFromStart > 0 && (
                    <div
                      className="absolute left-0 right-0 bg-blue-50/40 dark:bg-blue-900/20 pointer-events-none"
                      style={{
                        top: 0,
                        height: `${nowTopPercent}%`,
                      }}
                    />
                  )}

                  {/* Current time indicator line */}
                  {isToday && minutesFromStart >= 0 && minutesFromStart <= totalMinutes && (
                    <div
                      className="absolute left-0 right-0 pointer-events-none"
                      style={{ top: `${nowTopPercent}%` }}
                    >
                      <div className="relative">
                        <div className="absolute -left-1 -right-1 h-0.5 bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.7)]" />
                        <div className="absolute -left-2 -top-1 w-2 h-2 rounded-full bg-red-500" />
                        <div className="absolute left-full -translate-y-1/2 ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-semibold rounded shadow-sm">
                          {format(currentTime, timeFormat === '24h' ? 'HH:mm' : 'h:mm a')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Combined events (local + external) with overlap layout */}
                  <div className="relative h-full pointer-events-none">
                    {(() => {
                      const dayStart = new Date(day);
                      dayStart.setHours(0,0,0,0);
                      const dayEnd = new Date(dayStart.getTime() + (HOUR_END - HOUR_START) * 60 * 60 * 1000);

                      // Build items
                      const itemsBase: Omit<RenderItem, 'col' | 'cols' | 'topPx' | 'heightPx'>[] = [];
                      for (const block of dayEntries) {
                        const startMin = (block.startHour - HOUR_START) * 60 + block.startMinute;
                        const endMin = startMin + (block.entry.duration / 60);
                        const calendar = calendars?.find(c => c.id === block.entry.calendarId);
                        itemsBase.push({
                          kind: 'local',
                          id: `local:${block.entry.id}`,
                          startMin: Math.max(0, startMin),
                          endMin: Math.min(24*60, endMin),
                          color: calendar?.color || block.project?.color || '#888888',
                          local: block,
                          external: undefined,
                        });
                      }
                      for (const ev of externalEventsInWeek) {
                        if (ev.allDay) continue; // render all-day separately
                        const evStart = new Date(ev.start);
                        const evEnd = new Date(ev.end);
                        if (evEnd <= dayStart || evStart >= dayEnd) continue;
                        const overlapStart = evStart > dayStart ? evStart : dayStart;
                        const overlapEnd = evEnd < dayEnd ? evEnd : dayEnd;
                        const startMin = (overlapStart.getTime() - dayStart.getTime()) / 60000;
                        const endMin = (overlapEnd.getTime() - dayStart.getTime()) / 60000;
                        itemsBase.push({
                          kind: 'external',
                          id: `ext:${ev.id}:${overlapStart.getTime()}`,
                          startMin: Math.max(0, startMin),
                          endMin: Math.max(startMin + 0.25, Math.min(24*60, endMin)),
                          color: ev.color || '#3b82f6',
                          local: undefined,
                          external: ev,
                        });
                      }

                      const laidOut = assignColumns(itemsBase);
                      return laidOut.map((item, idx) => {
                        const widthPct = 100 / item.cols;
                        const leftPct = item.col * widthPct;
                        const innerGap = 2; // px
                        const stylePos = {
                          top: `${item.topPx}px`,
                          height: `${item.heightPx}px`,
                          left: `calc(${leftPct}% + 0px)`,
                          width: `calc(${widthPct}% - ${innerGap}px)`,
                          minHeight: '16px',
                          zIndex: item.kind === 'external' ? 0 : 1,
                        } as React.CSSProperties;

                        if (item.kind === 'external' && item.external) {
                          const color = item.color || '#3b82f6';
                          const bg = `repeating-linear-gradient(45deg, ${color}22 0, ${color}22 6px, transparent 6px, transparent 12px)`;
                          const ev = item.external;
                          return (
                            <Tooltip key={`ci-${idx}`}>
                              <TooltipTrigger asChild>
                                <div
                                  className="absolute rounded-md text-xs font-medium overflow-hidden pointer-events-auto border border-blue-500/50"
                                  style={{ ...stylePos, backgroundImage: bg }}
                                  onMouseDown={() => { suppressNextMouseUp.current = true; }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (ev.url) window.open(ev.url, '_blank', 'noopener,noreferrer');
                                  }}
                                >
                                  <div className="px-1.5 py-1 truncate text-blue-700 dark:text-blue-200">
                                    {ev.title || 'External event'}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="text-xs">
                                <div className="space-y-1 max-w-xs">
                                  <p className="font-semibold">{ev.title || 'External event'}</p>
                                  <p>
                                    {format(new Date(ev.start), timeFormat === '24h' ? 'MMM d, HH:mm' : 'MMM d, h:mm a')} – {format(new Date(ev.end), timeFormat === '24h' ? 'HH:mm' : 'h:mm a')}
                                  </p>
                                  {ev.location && <p className="text-muted-foreground">{ev.location}</p>}
                                  {ev.url && (
                                    <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Open in calendar</a>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        }

                        // Local block
                        const block = item.local!;
                        const hexToRgb = (hex: string) => {
                          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                          return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '136, 136, 136';
                        };
                        const calendarColor = item.color || '#888888';
                        const rgbColor = hexToRgb(calendarColor);
                        return (
                          <Tooltip key={`ci-${idx}`}>
                            <TooltipTrigger asChild>
                              <div
                                className="absolute rounded-md p-1.5 text-white text-xs font-medium overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/50 transition-all pointer-events-auto group"
                                style={{ 
                                  ...stylePos,
                                  backgroundColor: `rgba(${rgbColor}, 0.25)`,
                                  borderWidth: '2px',
                                  borderColor: calendarColor,
                                  color: '#ffffff',
                                  textShadow: '0 0 2px rgba(0,0,0,0.8)'
                                }}
                                onMouseDown={() => { suppressNextMouseUp.current = true; }}
                                onContextMenu={(e) => handleBlockContextMenu(block.entry, e)}
                              >
                                <button
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    suppressNextMouseUp.current = true;
                                  }}
                                  onMouseUp={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    suppressNextMouseUp.current = true;
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setIsDragging(false);
                                    setDragStart(null);
                                    setDragEnd(null);
                                    if (confirm('Delete this time entry?')) {
                                      deleteEntry(block.entry.id);
                                    }
                                  }}
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 rounded-sm p-0.5"
                                  aria-label="Delete entry"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                                <div className="truncate font-semibold text-xs">
                                  {block.entry.description || 'Untitled'}
                                </div>
                                {item.heightPx > 32 && (
                                  <div className="truncate text-xs opacity-90">
                                  {timeFormat === '24h'
                                    ? format(parseISO(block.entry.date), 'HH:mm') 
                                    : format(parseISO(block.entry.date), 'h:mm a')
                                  } - {format(parseISO(block.entry.date).getTime() + block.entry.duration * 1000, timeFormat === '24h' ? 'HH:mm' : 'h:mm a')}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs">
                              <div className="space-y-1">
                                <p className="font-semibold">{block.entry.description || 'Untitled'}</p>
                                <p className="text-muted-foreground">{block.project?.name || 'No project'}</p>
                                <p>
                                  {timeFormat === '24h'
                                    ? format(parseISO(block.entry.date), 'HH:mm')
                                    : format(parseISO(block.entry.date), 'h:mm a')
                                  } -{' '}
                                  {format(
                                    new Date(parseISO(block.entry.date).getTime() + block.entry.duration * 1000),
                                    timeFormat === '24h' ? 'HH:mm' : 'h:mm a'
                                  )}
                                </p>
                                <p>Duration: {Math.round((block.entry.duration / 60) * 10) / 10} min</p>
                                {block.entry.tags && block.entry.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {block.entry.tags.map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      });
                    })()}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>

        {/* Create Entry Modal */}
        <CreateEntryModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setDragStart(null);
            setDragEnd(null);
            setSelectedStartTime(null);
            setSelectedEndTime(null);
          }}
          startTime={modalStartTime}
          endTime={modalEndTime}
          defaultCalendarId={createCalendarId === 'none' ? undefined : createCalendarId}
          calendars={calendars || []}
        />

        <EditEntryModal
          isOpen={editOpen}
          onClose={() => {
            setEditOpen(false);
            setEditingEntry(null);
          }}
          entry={editingEntry}
        />
      </div>
      {ctxOpen && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-md shadow-lg p-1 text-sm"
          style={{ top: ctxPos.y + 2, left: ctxPos.x + 2, minWidth: 180 }}
          onMouseDown={(e) => { e.stopPropagation(); }}
        >
          {ctxType === 'block' && (
            <div className="flex flex-col">
              <button
                className="text-left px-3 py-2 hover:bg-muted rounded"
                onClick={() => {
                  if (ctxEntry) {
                    setEditingEntry(ctxEntry);
                    setEditOpen(true);
                  }
                  setCtxOpen(false);
                }}
              >
                Edit entry
              </button>
              <button
                className="text-left px-3 py-2 hover:bg-muted rounded text-red-600"
                onClick={() => {
                  if (ctxEntry && confirm('Delete this time entry?')) {
                    deleteEntry(ctxEntry.id);
                  }
                  setCtxOpen(false);
                }}
              >
                Delete entry
              </button>
            </div>
          )}
          {ctxType === 'grid' && ctxCreateAnchor && (
            <div className="flex flex-col">
              <button
                className="text-left px-3 py-2 hover:bg-muted rounded"
                onClick={() => {
                  const start = new Date(ctxCreateAnchor.day);
                  start.setHours(ctxCreateAnchor.hour, ctxCreateAnchor.minute, 0, 0);
                  const end = new Date(start);
                  end.setMinutes(end.getMinutes() + 30);
                  setSelectedStartTime(start);
                  setSelectedEndTime(end);
                  setModalOpen(true);
                  setCtxOpen(false);
                }}
              >
                Create entry here (30 min)
              </button>
            </div>
          )}
        </div>
      )}
      {/* Close context menu on outside click */}
      {ctxOpen && (
        <div
          className="fixed inset-0 z-40"
          onMouseDown={() => setCtxOpen(false)}
          onContextMenu={(e) => { e.preventDefault(); setCtxOpen(false); }}
        />
      )}
    </TooltipProvider>
  );
}
