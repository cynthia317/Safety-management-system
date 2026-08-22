import { Link } from 'react-router-dom';
import { StatusBadge } from '../StatusBadge';
import { computeOverallProgress } from '../../lib/inspectionProgress';
import { formatDate } from '../../lib/format';
import type { Inspection } from '../../lib/inspectionTypes';

interface InspectionCardProps {
  inspection: Inspection;
}

export function InspectionCard({ inspection }: InspectionCardProps) {
  const progress = computeOverallProgress(inspection);
  const targetPath =
    inspection.status === 'Draft' || inspection.status === 'In Progress'
      ? `/inspections/${inspection.id}/conduct`
      : `/inspections/${inspection.id}`;

  return (
    <Link
      to={targetPath}
      className="block rounded-md border border-border bg-surface p-3.5 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-muted">{inspection.referenceNumber}</span>
        <StatusBadge status={inspection.status} />
      </div>

      <p className="mt-1 text-sm font-medium text-heading">{inspection.title}</p>
      <p className="text-xs text-muted">{inspection.templateName}</p>

      <p className="mt-2 text-xs text-muted">
        {inspection.workplace} / {inspection.area}
      </p>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs text-muted">
        <span>{inspection.leadInspector}</span>
        <span>{formatDate(inspection.inspectionDate)}</span>
      </div>

      {inspection.status !== 'Draft' && (
        <div className="mt-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-hover">
            <div
              className={`h-full rounded-full ${progress.percent === 100 ? 'bg-emerald-500' : 'bg-accent'}`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {progress.answered}/{progress.total} answered ({progress.percent}%)
          </p>
        </div>
      )}
    </Link>
  );
}
