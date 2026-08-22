import type { ReactNode } from 'react';
import { Building2, Calendar, ClipboardList, MapPin, User } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { formatDate } from '../../lib/format';
import type { InspectionDetail } from '../../lib/inspectionTypes';

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="truncate text-sm text-body">{value}</p>
      </div>
    </div>
  );
}

interface InspectionDetailHeaderProps {
  inspection: InspectionDetail;
  actions: ReactNode;
}

export function InspectionDetailHeader({ inspection, actions }: InspectionDetailHeaderProps) {
  return (
    <div className="rounded-md border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted">{inspection.referenceNumber}</span>
            <StatusBadge status={inspection.status} />
          </div>
          <h1 className="mt-1.5 text-xl font-semibold leading-tight text-heading">{inspection.title}</h1>
          <p className="mt-1 text-sm text-muted">{inspection.templateName}</p>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetaItem icon={Building2} label="Workplace" value={inspection.workplace} />
        <MetaItem icon={MapPin} label="Area" value={inspection.area} />
        <MetaItem icon={Calendar} label="Date" value={formatDate(inspection.inspectionDate)} />
        <MetaItem icon={User} label="Lead Inspector" value={inspection.leadInspector} />
        <MetaItem icon={ClipboardList} label="Template Version" value={`v${inspection.templateVersion}`} />
      </dl>
    </div>
  );
}
