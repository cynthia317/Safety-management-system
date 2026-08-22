interface BarDatum {
  label: string;
  value: number;
  colorClassName?: string;
}

interface SimpleBarChartProps {
  data: BarDatum[];
  emptyLabel?: string;
}

const DEFAULT_BAR_COLOR = 'bg-accent';

export function SimpleBarChart({ data, emptyLabel = 'No data yet.' }: SimpleBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs text-muted" title={d.label}>
            {d.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-canvas-raised">
            <div
              className={`h-full rounded-full ${d.colorClassName ?? DEFAULT_BAR_COLOR}`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-7 shrink-0 text-right text-xs font-medium text-body">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export type { BarDatum };
