import { useMemo } from "react";
import { formatDurationShort } from "@/lib/utils-time";
import { cn } from "@/lib/utils";

interface TimelineChartProps {
  data: Array<{
    date: string;
    hours: number;
    billableHours?: number;
    revenue?: number;
  }>;
}

export function TimelineChart({ data }: TimelineChartProps) {
  const stats = useMemo(() => {
    if (!data.length) return { maxHours: 0 };
    const maxHours = Math.max(...data.map((d) => d.hours), 8);
    return { maxHours };
  }, [data]);

  if (!data.length) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hours Chart */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-semibold">Daily Hours</h3>
          <span className="text-xs text-muted-foreground">Peak: {stats.maxHours.toFixed(1)}h</span>
        </div>
        <div className="space-y-2">
          {data.map((item, index) => {
            const barHeight = stats.maxHours > 0 ? (item.hours / stats.maxHours) * 100 : 0;
            
            return (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16 text-right tabular-nums">{item.date}</span>
                <div className="flex-1 h-6 bg-muted rounded-sm overflow-hidden relative group">
                  {/* Total hours bar */}
                  <div
                    className="h-full bg-primary transition-all hover:bg-primary/80 relative"
                    style={{ width: `${Math.max(barHeight, 2)}%` }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-foreground text-background px-2 py-1 rounded text-xs whitespace-nowrap transition-opacity z-10">
                      {item.hours.toFixed(1)}h
                    </div>
                  </div>
                  
                  {/* Billable hours overlay */}
                  {item.billableHours && item.billableHours > 0 && (
                    <div
                      className="absolute top-0 left-0 h-full bg-green-500/60 transition-all"
                      style={{ width: `${Math.max((item.billableHours / stats.maxHours) * 100, 1)}%` }}
                    />
                  )}
                </div>
                <span className="text-xs text-muted-foreground w-12 tabular-nums">{item.hours.toFixed(1)}h</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
