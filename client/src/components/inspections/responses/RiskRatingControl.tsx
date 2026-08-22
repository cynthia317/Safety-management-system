import type { ResponseControlProps } from './types';

const LEVELS: { value: string; activeClass: string }[] = [
  { value: 'Low', activeClass: 'border-emerald-500 bg-emerald-500/15 text-emerald-400' },
  { value: 'Medium', activeClass: 'border-amber-500 bg-amber-500/15 text-amber-400' },
  { value: 'High', activeClass: 'border-orange-500 bg-orange-500/15 text-orange-400' },
  { value: 'Critical', activeClass: 'border-red-500 bg-red-500/15 text-red-400' },
];

export function RiskRatingControl({ value, onChange, disabled }: ResponseControlProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {LEVELS.map((level) => {
        const isActive = value === level.value;
        return (
          <button
            key={level.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(level.value)}
            className={`rounded-md border px-3 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-default disabled:opacity-60 ${
              isActive ? level.activeClass : 'border-border bg-surface text-body hover:bg-surface-hover'
            }`}
          >
            {level.value}
          </button>
        );
      })}
    </div>
  );
}
