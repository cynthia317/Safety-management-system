interface TrendDatum {
  label: string;
  value: number;
}

interface SimpleTrendChartProps {
  data: TrendDatum[];
}

export function SimpleTrendChart({ data }: SimpleTrendChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex h-32 items-end gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-xs font-medium text-body">{d.value}</span>
          <div className="flex h-24 w-full items-end overflow-hidden rounded-t bg-canvas-raised">
            <div className="w-full rounded-t bg-accent transition-all" style={{ height: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="text-[11px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export type { TrendDatum };
