import { useMemo } from "react";

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

  const maxHours = Math.max(...sorted.map((d) => d.hours));

  return (
    <div className="space-y-3">
      {sorted.map((project, index) => {
        const percentage = maxHours > 0 ? (project.hours / maxHours) * 100 : 0;
        
        return (
          <div key={index} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color || '#888888' }}
            />
            <span className="text-sm font-medium w-40 truncate">{project.name}</span>
            <div className="flex-1 h-6 bg-muted rounded-sm overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.max(percentage, 2)}%`,
                  backgroundColor: project.color || '#888888',
                }}
              />
            </div>
            <span className="text-sm text-muted-foreground w-16 text-right tabular-nums">
              {project.hours.toFixed(1)}h
            </span>
          </div>
        );
      })}
    </div>
  );
}
