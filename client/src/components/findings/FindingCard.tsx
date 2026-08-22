import { Link } from 'react-router-dom';
import { RiskBadge } from '../RiskBadge';
import { StatusBadge } from '../StatusBadge';
import { formatDueLabel } from '../../lib/format';
import type { Finding } from '../../lib/findingTypes';

const SEVERITY_ACCENT: Record<Finding['riskLevel'], string> = {
  Critical: 'border-l-red-500',
  High: 'border-l-orange-500',
  Medium: 'border-l-transparent',
  Low: 'border-l-transparent',
};

interface FindingCardProps {
  finding: Finding;
}

export function FindingCard({ finding }: FindingCardProps) {
  const isOverdue = finding.status !== 'Closed' && new Date(finding.dueDate).getTime() < Date.now();

  return (
    <Link
      to={`/findings/${finding.id}`}
      className={`block rounded-md border border-l-4 border-border bg-surface p-3.5 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${SEVERITY_ACCENT[finding.riskLevel]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-muted">{finding.referenceNumber}</span>
        <span
          className={`shrink-0 text-xs ${isOverdue ? 'font-medium text-red-400' : 'text-muted'}`}
          title={new Date(finding.dueDate).toLocaleDateString()}
        >
          {formatDueLabel(finding.dueDate)}
        </span>
      </div>

      <p className="mt-1 text-sm font-medium text-heading">{finding.title}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <RiskBadge level={finding.riskLevel} />
        <StatusBadge status={finding.status} />
      </div>

      <p className="mt-2 text-xs text-muted">
        {finding.workplace} / {finding.department}
      </p>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <span className="text-xs text-muted">
          {finding.assignedTo || <span className="italic text-muted">Unassigned</span>}
        </span>
      </div>
    </Link>
  );
}
