import { useMemo, useState } from 'react';
import { TimeEntry } from '@/lib/supabase-storage';
import { parseISO, startOfYear, endOfYear, format, eachDayOfInterval } from 'date-fns';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ContributionData {
  date: string;
  hours: number;
  dateObj: Date;
}

interface ContributionHeatmapProps {
  entries: TimeEntry[];
  showLabel?: boolean;
}

export function ContributionHeatmap({ entries, showLabel = true }: ContributionHeatmapProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Generate year options dynamically (current year and 4 years back)
  const yearOptions = useMemo(() => {
    const now = new Date();
    const current = now.getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push(current - i);
    }
    return years;
  }, []);
  // Calculate full calendar year data (Jan 1 - Dec 31)
  const heatmapData = useMemo(() => {
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const yearEnd = endOfYear(new Date(selectedYear, 11, 31));
    
    // Create a map of dates to hours tracked
    const dateMap = new Map<string, number>();
    
    entries.forEach((entry) => {
      try {
        const entryDate = parseISO(entry.date);
        
        // Only include entries in the selected year
        if (entryDate >= yearStart && entryDate <= yearEnd) {
          const dateKey = format(entryDate, 'yyyy-MM-dd');
          const currentHours = dateMap.get(dateKey) || 0;
          const entryHours = entry.duration / 3600; // Convert seconds to hours
          dateMap.set(dateKey, currentHours + entryHours);
        }
      } catch (e) {
        // Skip invalid date
      }
    });
    
    // Create array of all days in the selected year
    const allDays = eachDayOfInterval({
      start: yearStart,
      end: yearEnd,
    });
    
    const data: ContributionData[] = allDays.map((date) => ({
      date: format(date, 'yyyy-MM-dd'),
      hours: dateMap.get(format(date, 'yyyy-MM-dd')) || 0,
      dateObj: date,
    }));
    
    return data;
  }, [entries, selectedYear]);

  // Calculate max hours for color intensity
  const maxHours = useMemo(() => {
    return Math.max(...heatmapData.map((d) => d.hours), 1);
  }, [heatmapData]);

  // Get color intensity based on hours
  const getColor = (hours: number): string => {
    if (hours === 0) return '#ebedf0'; // Light gray for no activity
    
    const intensity = Math.min(hours / maxHours, 1);
    
    // Color gradient: light green -> dark green
    if (intensity < 0.25) return '#c6e48b'; // Very light green
    if (intensity < 0.5) return '#7bc96f';  // Light green
    if (intensity < 0.75) return '#239a3b'; // Green
    return '#0d3817'; // Dark green
  };

  // Group days by weeks (Sunday to Saturday), ensuring proper alignment
  const weeks: ContributionData[][] = useMemo(() => {
    if (heatmapData.length === 0) return [];
    
    const result: ContributionData[][] = [];
    const firstDay = heatmapData[0].dateObj;
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Create first week with empty slots before January 1st
    let currentWeek: (ContributionData | null)[] = Array(7).fill(null);
    
    heatmapData.forEach((day) => {
      const dayOfWeek = day.dateObj.getDay();
      currentWeek[dayOfWeek] = day;
      
      // If we've filled Saturday (last day of week), push the week
      if (dayOfWeek === 6) {
        result.push(currentWeek.map(d => d || { date: '', hours: 0, dateObj: new Date() }));
        currentWeek = Array(7).fill(null);
      }
    });
    
    // Add any remaining days in the last incomplete week
    if (currentWeek.some(d => d !== null)) {
      result.push(currentWeek.map(d => d || { date: '', hours: 0, dateObj: new Date() }));
    }
    
    return result;
  }, [heatmapData]);

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthLabels = useMemo(() => {
    const labels = new Set<string>();
    const labelMap = new Map<number, string>();
    
    heatmapData.forEach((day) => {
      const month = day.dateObj.getMonth();
      const monthStr = format(day.dateObj, 'MMM');
      
      if (!labelMap.has(month)) {
        labelMap.set(month, monthStr);
        labels.add(monthStr);
      }
    });
    
    return Array.from(labelMap.values());
  }, [heatmapData]);

  // Calculate stats
  const stats = useMemo(() => {
    const daysActive = heatmapData.filter((d) => d.hours > 0).length;
    const totalHours = heatmapData.reduce((sum, d) => sum + d.hours, 0);
    const avgHoursPerDay = daysActive > 0 ? totalHours / daysActive : 0;
    const maxDay = Math.max(...heatmapData.map((d) => d.hours), 0);
    
    return {
      daysActive,
      totalHours: Math.round(totalHours * 10) / 10,
      avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
      maxDay: Math.round(maxDay * 10) / 10,
    };
  }, [heatmapData]);

  const cellSize = 'clamp(10px, 1.8vw, 14px)';
  const cellGap = 'clamp(4px, 1vw, 6px)';
  const labelWidth = 'clamp(24px, 5vw, 32px)';

  return (
    <TooltipProvider>
      <div className="space-y-6 w-full">
        {showLabel && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Contribution Activity</h3>
                <p className="text-sm text-muted-foreground">Track your consistency throughout {selectedYear}</p>
              </div>
              <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Days Active</p>
                <p className="text-2xl font-bold">{stats.daysActive}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{stats.totalHours}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Avg/Active Day</p>
                <p className="text-2xl font-bold">{stats.avgHoursPerDay}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Best Day</p>
                <p className="text-2xl font-bold">{stats.maxDay}h</p>
              </div>
            </div>
          </div>
        )}

        <div className="w-full pb-4 overflow-x-auto">
          <div className="inline-flex w-full" style={{ gap: cellGap }}>
            {/* Left side: day labels */}
            <div className="flex flex-col pt-0 flex-shrink-0" style={{ gap: cellGap, width: labelWidth }}>
              {dayLabels.map((label) => (
                <div
                  key={label}
                  className="text-xs text-muted-foreground flex items-center justify-start font-medium"
                  style={{ width: '100%', height: cellSize }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Main heatmap - grows to fill available space */}
            <div className="flex flex-1" style={{ gap: cellGap }}>
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col flex-shrink-0" style={{ gap: cellGap }}>
                  {week.map((day, dayIndex) => {
                    // Don't render placeholder blocks
                    if (!day.date) {
                      return (
                        <div
                          key={`${weekIndex}-${dayIndex}`}
                          className="flex-shrink-0"
                          style={{ width: cellSize, height: cellSize }}
                        />
                      );
                    }
                    
                    return (
                      <Tooltip key={`${weekIndex}-${dayIndex}`}>
                        <TooltipTrigger asChild>
                          <div
                            className="rounded-sm cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-1 transition-all flex-shrink-0"
                            style={{
                              backgroundColor: getColor(day.hours),
                              width: cellSize,
                              height: cellSize,
                            }}
                            role="img"
                            aria-label={`${day.hours.toFixed(1)}h on ${format(day.dateObj, 'MMM d, yyyy')}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={5} className="text-xs">
                          <p className="font-medium">
                            {day.hours.toFixed(1)}h tracked
                          </p>
                          <p className="text-muted-foreground">
                            {format(day.dateObj, 'MMM d, yyyy')}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-6 text-xs text-muted-foreground" style={{ paddingLeft: labelWidth }}>
            <span>Less</span>
            <div className="flex" style={{ gap: cellGap }}>
              <div className="rounded-sm" style={{ backgroundColor: '#ebedf0', width: cellSize, height: cellSize }} />
              <div className="rounded-sm" style={{ backgroundColor: '#c6e48b', width: cellSize, height: cellSize }} />
              <div className="rounded-sm" style={{ backgroundColor: '#7bc96f', width: cellSize, height: cellSize }} />
              <div className="rounded-sm" style={{ backgroundColor: '#239a3b', width: cellSize, height: cellSize }} />
              <div className="rounded-sm" style={{ backgroundColor: '#0d3817', width: cellSize, height: cellSize }} />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
