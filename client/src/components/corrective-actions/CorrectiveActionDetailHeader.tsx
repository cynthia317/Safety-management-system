import type { ReactNode } from 'react';
import { Building2, Calendar, MapPin, User, UserCheck } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { RiskBadge } from '../RiskBadge';
import { formatDueLabel } from '../../lib/format';
import type { CorrectiveActionDetail } from '../../lib/correctiveActionTypes';

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

interface CorrectiveActionDetailHeaderProps {
  action: CorrectiveActionDetail;
  actions: ReactNode;
}

export function CorrectiveActionDetailHeader({ action, actions }: CorrectiveActionDetailHeaderProps) {
  const isOverdue = action.status !== 'Closed' && new Date(action.dueDate).getTime() < Date.now();

  return (
    <div className={`rounded-md border bg-surface p-4 sm:p-5 ${isOverdue ? 'border-red-500/30' : 'border-border'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted">{action.referenceNumber}</span>
            <RiskBadge level={action.priority} />
            <StatusBadge status={action.status} />
          </div>
          <h1 className="mt-1.5 text-xl font-semibold leading-tight text-heading">{action.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {action.workplace} / {action.department}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetaItem icon={Building2} label="Workplace" value={action.workplace} />
        <MetaItem icon={MapPin} label="Location" value={action.location} />
        <MetaItem
          icon={Calendar}
          label="Due"
          value={formatDueLabel(action.dueDate)}
          title={new Date(action.dueDate).toLocaleDateString()}
          emphasize={isOverdue}
        />
        <MetaItem icon={User} label="Created By" value={action.createdBy} />
        <MetaItem
          icon={UserCheck}
          label="Responsible"
          value={action.assignedTo || 'Unassigned'}
          emphasize={!action.assignedTo}
        />
        <MetaItem icon={UserCheck} label="Verified By" value={action.verifiedBy || 'Not yet verified'} />
      </dl>
    </div>
  );
}
