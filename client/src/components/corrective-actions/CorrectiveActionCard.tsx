import { Link } from 'react-router-dom';
import { RiskBadge } from '../RiskBadge';
import { StatusBadge } from '../StatusBadge';
import { formatDueLabel } from '../../lib/format';
import type { CorrectiveAction } from '../../lib/correctiveActionTypes';

const SEVERITY_ACCENT: Record<CorrectiveAction['priority'], string> = {
  Critical: 'border-l-red-500',
  High: 'border-l-orange-500',
  Medium: 'border-l-transparent',
  Low: 'border-l-transparent',
};

interface CorrectiveActionCardProps {
  action: CorrectiveAction;
}

export function CorrectiveActionCard({ action }: CorrectiveActionCardProps) {
  const isOverdue = action.status !== 'Closed' && new Date(action.dueDate).getTime() < Date.now();

  return (
    <Link
      to={`/corrective-actions/${action.id}`}
      className={`block rounded-md border border-l-4 border-border bg-surface p-3.5 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${SEVERITY_ACCENT[action.priority]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-muted">{action.referenceNumber}</span>
        <span
          className={`shrink-0 text-xs ${isOverdue ? 'font-medium text-red-400' : 'text-muted'}`}
          title={new Date(action.dueDate).toLocaleDateString()}
        >
          {formatDueLabel(action.dueDate)}
        </span>
      </div>

      <p className="mt-1 text-sm font-medium text-heading">{action.title}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <RiskBadge level={action.priority} />
        <StatusBadge status={action.status} />
      </div>

      <p className="mt-2 text-xs text-muted">
        {action.workplace} / {action.department}
      </p>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <span className="text-xs text-muted">{action.assignedTo || <span className="italic text-muted">Unassigned</span>}</span>
      </div>
    </Link>
  );
}
