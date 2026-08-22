import type { ResponseControlProps } from './types';

const OPTIONS: { value: string; label: string; activeClass: string }[] = [
  { value: 'Compliant', label: 'Compliant', activeClass: 'border-emerald-500 bg-emerald-500/15 text-emerald-400' },
  { value: 'Non-Compliant', label: 'Non-Compliant', activeClass: 'border-red-500 bg-red-500/15 text-red-400' },
  { value: 'Observation', label: 'Observation', activeClass: 'border-amber-500 bg-amber-500/15 text-amber-400' },
  { value: 'Not Applicable', label: 'Not Applicable', activeClass: 'border-slate-500 bg-slate-500/15 text-slate-300' },
];

export function ComplianceControl({ value, onChange, disabled }: ResponseControlProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`rounded-md border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-default disabled:opacity-60 ${
              isActive ? opt.activeClass : 'border-border bg-surface text-body hover:bg-surface-hover'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
