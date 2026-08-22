import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
  className?: string;
}

export function SectionCard({
  title,
  description,
  action,
  children,
  noPadding = false,
  className = '',
}: SectionCardProps) {
  return (
    <div className={`rounded-md border border-border bg-surface ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-heading">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className={noPadding ? '' : 'p-4'}>{children}</div>
    </div>
  );
}
