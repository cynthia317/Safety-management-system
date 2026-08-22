import type { ReactNode } from 'react';
import { Building2, Calendar, MapPin, User, UserCheck } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { RiskBadge } from '../RiskBadge';
import { formatDueLabel } from '../../lib/format';
import type { FindingDetail } from '../../lib/findingTypes';

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
        <p className={`truncate text-sm ${emphasize ? 'font-medium text-red-400' : 'text-body'}`}>{value}</p>
      </div>
    </div>
  );
}

interface FindingDetailHeaderProps {
  finding: FindingDetail;
  actions: ReactNode;
}

export function FindingDetailHeader({ finding, actions }: FindingDetailHeaderProps) {
  const isOverdue = finding.status !== 'Closed' && new Date(finding.dueDate).getTime() < Date.now();

  return (
    <div className="rounded-md border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted">{finding.referenceNumber}</span>
            <RiskBadge level={finding.riskLevel} />
            <StatusBadge status={finding.status} />
          </div>
          <h1 className="mt-1.5 text-xl font-semibold leading-tight text-heading">{finding.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {finding.workplace} / {finding.department}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetaItem icon={Building2} label="Workplace" value={finding.workplace} />
        <MetaItem icon={MapPin} label="Department" value={finding.department} />
        <MetaItem icon={MapPin} label="Location" value={finding.location} />
        <MetaItem
          icon={Calendar}
          label="Due"
          value={formatDueLabel(finding.dueDate)}
          title={new Date(finding.dueDate).toLocaleDateString()}
          emphasize={isOverdue}
        />
        <MetaItem icon={User} label="Created By" value={finding.createdBy} />
        <MetaItem
          icon={UserCheck}
          label="Assigned"
          value={finding.assignedTo || 'Unassigned'}
          emphasize={!finding.assignedTo}
        />
      </dl>
    </div>
  );
}
