import { AlertOctagon } from 'lucide-react';

interface OverdueBadgeProps {
  label: string;
  title?: string;
}

export function OverdueBadge({ label, title }: OverdueBadgeProps) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400"
    >
      <AlertOctagon className="h-3 w-3" />
      {label}
    </span>
  );
}
