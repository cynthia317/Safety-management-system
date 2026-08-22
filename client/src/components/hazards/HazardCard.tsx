import { Link } from 'react-router-dom';
import { RiskBadge } from '../RiskBadge';
import { StatusBadge } from '../StatusBadge';
import { OverdueBadge } from '../OverdueBadge';
import { formatRelativeTime } from '../../lib/format';
import { formatOverdueBy, formatSlaExplanation, isHazardOverdue } from '../../lib/hazardSla';
import type { HazardReport } from '../../lib/hazardTypes';

const SEVERITY_ACCENT: Record<HazardReport['riskLevel'], string> = {
  Critical: 'border-l-red-500',
  High: 'border-l-orange-500',
  Medium: 'border-l-transparent',
  Low: 'border-l-transparent',
};

interface HazardCardProps {
  hazard: HazardReport;
}

export function HazardCard({ hazard }: HazardCardProps) {
  const overdue = isHazardOverdue(hazard);

  return (
    <Link
      to={`/hazards/${hazard.id}`}
      className={`block rounded-md border border-l-4 border-border bg-surface p-3.5 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${SEVERITY_ACCENT[hazard.riskLevel]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-muted">{hazard.referenceNumber}</span>
        <span className="shrink-0 text-xs text-muted" title={new Date(hazard.reportedAt).toLocaleString()}>
          {formatRelativeTime(hazard.reportedAt)}
        </span>
      </div>

      <p className="mt-1 text-sm font-medium text-heading">{hazard.title}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <RiskBadge level={hazard.riskLevel} />
        <StatusBadge status={hazard.status} />
        {overdue && <OverdueBadge label={formatOverdueBy(hazard)} title={formatSlaExplanation(hazard)} />}
      </div>

      <p className="mt-2 text-xs text-muted">
        {hazard.workplace} / {hazard.department}
      </p>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <span className="text-xs text-muted">
          {hazard.assignedTo || <span className="italic text-muted">Unassigned</span>}
        </span>
      </div>
    </Link>
  );
}
