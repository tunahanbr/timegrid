import { useMemo, useState } from 'react';
import { TimeEntry, Project } from '@/lib/supabase-storage';
import { addMonths, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek, eachDayOfInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthCalendarProps {
  entries: TimeEntry[];
  projects: Project[];
}

export default function MonthCalendar({ entries, projects }: MonthCalendarProps) {
  const [current, setCurrent] = useState(() => startOfMonth(new Date()));

  const startGrid = useMemo(() => startOfWeek(startOfMonth(current), { weekStartsOn: 0 }), [current]);
  const endGrid = useMemo(() => endOfWeek(endOfMonth(current), { weekStartsOn: 0 }), [current]);
  const days = useMemo(() => eachDayOfInterval({ start: startGrid, end: endGrid }), [startGrid, endGrid]);

  const entriesByDay = useMemo(() => {
    const map: Record<string, TimeEntry[]> = {};
    for (const d of days) map[format(d, 'yyyy-MM-dd')] = [];
    for (const e of entries) {
      try {
        const d = format(parseISO(e.startTime || e.date), 'yyyy-MM-dd');
        if (map[d]) map[d].push(e);
      } catch (err) {
        // Ignore malformed dates while building calendar map
        console.debug('Skipping malformed entry date', err);
      }
    }
    return map;
  }, [days, entries]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrent(addMonths(current, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrent(startOfMonth(new Date()))}>This Month</Button>
          <Button variant="outline" size="sm" onClick={() => setCurrent(addMonths(current, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <span className="text-sm font-medium text-muted-foreground ml-4">{format(current, 'MMMM yyyy')}</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded overflow-hidden">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="p-2 text-center text-xs font-semibold bg-muted/40">{d}</div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, current);
          const dayEntries = entriesByDay[key] || [];
          return (
            <div key={key} className={`min-h-24 p-2 border border-border/50 ${inMonth ? 'bg-background' : 'bg-muted/20'} flex flex-col gap-1`}>
              <div className={`text-xs font-semibold ${inMonth ? '' : 'text-muted-foreground'}`}>{format(day, 'd')}</div>
              <div className="space-y-1">
                {dayEntries.slice(0, 3).map((e) => {
                  const proj = projects.find(p => p.id === e.projectId);
                  return (
                    <div key={e.id} className="text-[11px] truncate px-1 py-0.5 rounded" style={{ backgroundColor: (proj?.color || '#9CA3AF') + '22' }}>
                      {e.description || 'Untitled'}
                    </div>
                  );
                })}
                {dayEntries.length > 3 && (
                  <div className="text-[10px] text-muted-foreground">+{dayEntries.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
