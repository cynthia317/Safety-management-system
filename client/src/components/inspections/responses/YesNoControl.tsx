import type { ResponseControlProps } from './types';

export function YesNoControl({ value, onChange, disabled }: ResponseControlProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('Yes')}
        className={`rounded-md border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-default disabled:opacity-60 ${
          value === 'Yes' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400' : 'border-border bg-surface text-body hover:bg-surface-hover'
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('No')}
        className={`rounded-md border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-default disabled:opacity-60 ${
          value === 'No' ? 'border-red-500 bg-red-500/15 text-red-400' : 'border-border bg-surface text-body hover:bg-surface-hover'
        }`}
      >
        No
      </button>
    </div>
  );
}
