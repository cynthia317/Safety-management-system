import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ClipboardList, Wrench } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { EmptyState } from '../EmptyState';
import { LoadingState } from '../LoadingState';
import { StatusBadge } from '../StatusBadge';
import { RiskBadge } from '../RiskBadge';
import { listCorrectiveActions } from '../../lib/correctiveActionsApi';
import type { Finding } from '../../lib/findingTypes';
import type { CorrectiveAction } from '../../lib/correctiveActionTypes';

interface FindingRelatedRecordsPanelProps {
  finding: Finding;
}

export function FindingRelatedRecordsPanel({ finding }: FindingRelatedRecordsPanelProps) {
  const [actions, setActions] = useState<CorrectiveAction[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    listCorrectiveActions()
      .then((all) => {
        if (cancelled) return;
        setActions(all.filter((a) => a.findingId === finding.id));
      })
      .catch(() => {
        if (!cancelled) setActions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [finding.id]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <SectionCard title="Source Hazard Report">
        {finding.hazardId && finding.hazardReferenceNumber ? (
          <Link
            to={`/hazards/${finding.hazardId}`}
            className="flex items-center gap-3 rounded-md border border-border bg-canvas-raised p-3 transition-colors hover:border-accent/50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-500/10 text-muted">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted">{finding.hazardReferenceNumber}</p>
              <p className="truncate text-sm font-medium text-heading">View originating hazard report</p>
            </div>
          </Link>
        ) : (
          <EmptyState
            icon={AlertTriangle}
            title="No source hazard"
            description="This finding was not created from a hazard report."
          />
        )}
      </SectionCard>

      <SectionCard title="Source Inspection">
        {finding.inspectionId && finding.inspectionReferenceNumber ? (
          <Link
            to={`/inspections/${finding.inspectionId}`}
            className="flex items-center gap-3 rounded-md border border-border bg-canvas-raised p-3 transition-colors hover:border-accent/50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-500/10 text-muted">
              <ClipboardList className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted">{finding.inspectionReferenceNumber}</p>
              <p className="truncate text-sm font-medium text-heading">View originating inspection</p>
            </div>
          </Link>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No source inspection"
            description="This finding was not created from an inspection."
          />
        )}
      </SectionCard>

      <SectionCard title="Corrective Action">
        {actions === null ? (
          <LoadingState label="Loading…" />
        ) : actions.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No corrective action yet"
            description="Use the Create Corrective Action action above to assign a fix for this finding."
          />
        ) : (
          <ul className="space-y-2">
            {actions.map((action) => (
              <li key={action.id}>
                <Link
                  to={`/corrective-actions/${action.id}`}
                  className="flex items-center gap-3 rounded-md border border-border bg-canvas-raised p-3 transition-colors hover:border-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-muted">{action.referenceNumber}</p>
                    <p className="truncate text-sm font-medium text-heading">{action.title}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <RiskBadge level={action.priority} />
                    <StatusBadge status={action.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
