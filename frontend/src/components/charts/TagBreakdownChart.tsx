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
    return [...data].sort((a, b) => b.hours - a.hours).slice(0, 15);
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
        const percentage = (tag.hours / maxHours) * 100;
        const hue = (index * 360) / sorted.length;
        
        return (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white"
                  style={{ 
                    backgroundColor: `hsl(${hue}, 70%, 50%)`,
                  }}
                >
                  {tag.name}
                </span>
                <span className="text-sm text-muted-foreground ml-auto">{tag.hours.toFixed(1)}h</span>
              </div>
            </div>
            
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: `hsl(${hue}, 70%, 50%)`,
                  opacity: 0.7,
                }}
              />
            </div>
            
            <div className="text-xs text-muted-foreground">
              {tag.percentage}% of total time
            </div>
          </div>
        );
      })}

      {data.length > sorted.length && (
        <div className="p-3 bg-muted/50 rounded text-xs text-muted-foreground">
          +{data.length - sorted.length} more tags (showing top 15)
        </div>
      )}
    </div>
  );
}
