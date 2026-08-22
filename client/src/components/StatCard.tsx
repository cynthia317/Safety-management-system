import type { LucideIcon } from 'lucide-react';

type StatCardTone = 'default' | 'accent' | 'danger' | 'warning' | 'success';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: StatCardTone;
}

const TONE_STYLES: Record<StatCardTone, string> = {
  default: 'bg-slate-500/10 text-slate-300',
  accent: 'bg-accent/15 text-accent',
  danger: 'bg-red-500/10 text-red-400',
  warning: 'bg-amber-500/10 text-amber-400',
  success: 'bg-emerald-500/10 text-emerald-400',
};

export function StatCard({ label, value, hint, icon: Icon, tone = 'default' }: StatCardProps) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${TONE_STYLES[tone]}`}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-heading">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
