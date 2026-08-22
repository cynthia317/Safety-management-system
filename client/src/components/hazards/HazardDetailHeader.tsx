import type { ReactNode } from 'react';
import { Building2, Calendar, MapPin, User, UserCheck } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { RiskBadge } from '../RiskBadge';
import { OverdueBadge } from '../OverdueBadge';
import { formatRelativeTime } from '../../lib/format';
import { formatOverdueBy, formatSlaExplanation, isHazardOverdue } from '../../lib/hazardSla';
import type { HazardDetail } from '../../lib/hazardTypes';

function MetaItem({
  icon: Icon,
  label,
  value,
  title,
  emphasize,
}: {
  icon: typeof Building2;
  label: string;
  value: ReactNode;
  title?: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-start gap-2" title={title}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className={`truncate text-sm ${emphasize ? 'font-medium text-amber-400' : 'text-body'}`}>{value}</p>
      </div>
    </div>
  );
}

interface HazardDetailHeaderProps {
  hazard: HazardDetail;
  actions: ReactNode;
}

export function HazardDetailHeader({ hazard, actions }: HazardDetailHeaderProps) {
  const overdue = isHazardOverdue(hazard);

  return (
    <div className={`rounded-md border bg-surface p-4 sm:p-5 ${overdue ? 'border-red-500/30' : 'border-border'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted">{hazard.referenceNumber}</span>
            <RiskBadge level={hazard.riskLevel} />
            <StatusBadge status={hazard.status} />
            {overdue && (
              <OverdueBadge label={formatOverdueBy(hazard)} title={formatSlaExplanation(hazard)} />
            )}
          </div>
          <h1 className="mt-1.5 text-xl font-semibold leading-tight text-heading">{hazard.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {hazard.hazardCategory} &middot; {hazard.reportType}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetaItem icon={Building2} label="Workplace" value={hazard.workplace} />
        <MetaItem icon={MapPin} label="Department" value={hazard.department} />
        <MetaItem icon={MapPin} label="Location" value={hazard.location} />
        <MetaItem
          icon={Calendar}
          label="Reported"
          value={formatRelativeTime(hazard.reportedAt)}
          title={new Date(hazard.reportedAt).toLocaleString()}
        />
        <MetaItem icon={User} label="Reporter" value={hazard.reportedBy} />
        <MetaItem
          icon={UserCheck}
          label="Assigned"
          value={hazard.assignedTo || 'Unassigned'}
          emphasize={!hazard.assignedTo}
        />
      </dl>
    </div>
  );
}
