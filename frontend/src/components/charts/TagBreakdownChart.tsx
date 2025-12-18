import { useMemo } from "react";

interface TagBreakdownProps {
  data: Array<{
    name: string;
    hours: number;
    percentage: number;
  }>;
}

export function TagBreakdownChart({ data }: TagBreakdownProps) {
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => b.hours - a.hours).slice(0, 8);
  }, [data]);

  if (!sorted.length) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No tag data
      </div>
    );
  }

  const maxHours = Math.max(...sorted.map((d) => d.hours));

  return (
    <div className="space-y-3">
      {sorted.map((tag, index) => {
        const percentage = maxHours > 0 ? (tag.hours / maxHours) * 100 : 0;
        
        return (
          <div key={index} className="flex items-center gap-3">
            <span className="text-sm font-medium w-32 truncate">{tag.name}</span>
            <div className="flex-1 h-6 bg-muted rounded-sm overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.max(percentage, 2)}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground w-16 text-right tabular-nums">
              {tag.hours.toFixed(1)}h
            </span>
          </div>
        );
      })}
    </div>
  );
}
