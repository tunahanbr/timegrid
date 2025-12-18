import { useMemo } from "react";

interface ClientBreakdownProps {
  data: Array<{
    name: string;
    hours: number;
    percentage: number;
    revenue?: number;
  }>;
}

export function ClientBreakdownChart({ data }: ClientBreakdownProps) {
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => b.hours - a.hours);
  }, [data]);

  if (!sorted.length) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No client data
      </div>
    );
  }

  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-green-500",
    "bg-yellow-500",
  ];

  // Pie chart visualization
  let cumulativePercentage = 0;
  const segments = sorted.map((client, index) => {
    const startPercentage = cumulativePercentage;
    cumulativePercentage += client.percentage;
    
    const startDegrees = (startPercentage / 100) * 360;
    const endDegrees = (cumulativePercentage / 100) * 360;
    
    return {
      ...client,
      startDegrees,
      endDegrees,
      color: colors[index % colors.length],
    };
  });

  return (
    <div className="space-y-6">
      {/* Donut chart */}
      <div className="flex justify-center">
        <div className="relative w-64 h-64">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {segments.map((segment, index) => {
              const radius = 80;
              const innerRadius = 50;
              
              const startAngle = (segment.startDegrees * Math.PI) / 180;
              const endAngle = (segment.endDegrees * Math.PI) / 180;
              
              const x1 = 100 + radius * Math.cos(startAngle);
              const y1 = 100 + radius * Math.sin(startAngle);
              const x2 = 100 + radius * Math.cos(endAngle);
              const y2 = 100 + radius * Math.sin(endAngle);
              
              const ix1 = 100 + innerRadius * Math.cos(startAngle);
              const iy1 = 100 + innerRadius * Math.sin(startAngle);
              const ix2 = 100 + innerRadius * Math.cos(endAngle);
              const iy2 = 100 + innerRadius * Math.sin(endAngle);
              
              const largeArc = segment.endDegrees - segment.startDegrees > 180 ? 1 : 0;
              
              const color = [
                "#3b82f6", // blue
                "#a855f7", // purple
                "#ec4899", // pink
                "#10b981", // green
                "#f59e0b", // yellow
              ][index % 5];
              
              const path = [
                `M ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                `L ${ix2} ${iy2}`,
                `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
                `Z`
              ].join(" ");
              
              return (
                <g key={index}>
                  <path
                    d={path}
                    fill={color}
                    opacity="0.8"
                    className="hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <title>{segment.name}: {segment.percentage}%</title>
                  </path>
                </g>
              );
            })}
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {sorted.reduce((sum, c) => sum + c.hours, 0).toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">hours</div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {sorted.map((client, index) => {
          const color = [
            "bg-blue-500",
            "bg-purple-500",
            "bg-pink-500",
            "bg-green-500",
            "bg-yellow-500",
          ][index % 5];
          
          return (
            <div key={index} className="flex items-center justify-between p-3 rounded hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <div>
                  <div className="font-medium text-sm">{client.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {client.hours.toFixed(1)}h • {client.percentage}%
                  </div>
                </div>
              </div>
              {client.revenue && client.revenue > 0 && (
                <div className="text-sm font-semibold">${client.revenue.toFixed(2)}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
