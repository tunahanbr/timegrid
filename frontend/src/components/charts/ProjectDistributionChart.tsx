import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface ProjectDistributionProps {
  data: Array<{
    name: string;
    hours: number;
    percentage: number;
    color?: string;
    revenue?: number;
  }>;
}

export function ProjectDistributionChart({ data }: ProjectDistributionProps) {
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => b.hours - a.hours).slice(0, 10);
  }, [data]);

  if (!sorted.length) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground">
        No project data
      </div>
    );
  }

  const total = sorted.reduce((sum, item) => sum + item.hours, 0);
  const maxHours = Math.max(...sorted.map((d) => d.hours));

  return (
    <div className="space-y-4">
      {/* Horizontal bars */}
      <div className="space-y-3">
        {sorted.map((project, index) => {
          const percentage = (project.hours / maxHours) * 100;
          const percentageOfTotal = total > 0 ? Math.round((project.hours / total) * 100) : 0;
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color || `hsl(var(--chart-${(index % 5) + 1}))` }}
                  />
                  <span className="text-sm font-medium truncate">{project.name}</span>
                </div>
                <div className="text-sm text-muted-foreground ml-2 flex-shrink-0">
                  {project.hours.toFixed(1)}h
                </div>
              </div>
              
              <div className="h-6 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all flex items-center justify-center"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: project.color || `hsl(var(--chart-${(index % 5) + 1}))`,
                    opacity: 0.8,
                  }}
                >
                  {percentage > 10 && (
                    <span className="text-xs font-semibold text-white mix-blend-darken">
                      {percentageOfTotal}%
                    </span>
                  )}
                </div>
              </div>
              
              {project.revenue && project.revenue > 0 && (
                <div className="text-xs text-muted-foreground">
                  Revenue: ${project.revenue.toFixed(2)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-3 bg-muted rounded-lg">
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Hours:</span>
            <span className="font-semibold">{total.toFixed(1)}h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Projects:</span>
            <span className="font-semibold">{sorted.length}</span>
          </div>
          {data.some((d) => d.revenue) && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Revenue:</span>
              <span className="font-semibold">
                ${data.reduce((sum, d) => sum + (d.revenue || 0), 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
