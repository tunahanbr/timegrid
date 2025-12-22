import { useMemo, useState } from 'react';
import { TimeEntry } from '@/lib/supabase-storage';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface YearCalendarProps {
  entries: TimeEntry[];
}

function monthRange(base: Date, idx: number): { start: Date; end: Date } {
  const start = startOfMonth(addMonths(base, idx));
  const end = endOfMonth(start);
  return { start, end };
}

export default function YearCalendar({ entries }: YearCalendarProps) {
  const [yearStart, setYearStart] = useState(() => startOfMonth(new Date(new Date().getFullYear(), 0, 1)));

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => monthRange(yearStart, i)), [yearStart]);

  const stats = useMemo(() => {
    return months.map(({ start, end }) => {
      const msStart = start.getTime();
      const msEnd = end.getTime();
      const inMonth = entries.filter(e => {
        try {
          const d = new Date(e.startTime || e.date).getTime();
          return d >= msStart && d <= msEnd;
        } catch { return false; }
      });
      const totalHours = Math.round(inMonth.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600);
      return { count: inMonth.length, hours: totalHours };
    });
  }, [months, entries]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setYearStart(startOfMonth(new Date(yearStart.getFullYear() - 1, 0, 1)))}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setYearStart(startOfMonth(new Date(new Date().getFullYear(), 0, 1)))}>This Year</Button>
        <Button variant="outline" size="sm" onClick={() => setYearStart(startOfMonth(new Date(yearStart.getFullYear() + 1, 0, 1)))}><ChevronRight className="h-4 w-4" /></Button>
        <span className="text-sm font-medium text-muted-foreground ml-4">{format(yearStart, 'yyyy')}</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {months.map((m, i) => (
          <div key={i} className="border rounded p-3">
            <div className="text-sm font-semibold mb-1">{format(m.start, 'MMMM')}</div>
            <div className="text-xs text-muted-foreground">Entries: {stats[i].count}</div>
            <div className="text-xs text-muted-foreground">Hours: {stats[i].hours}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
