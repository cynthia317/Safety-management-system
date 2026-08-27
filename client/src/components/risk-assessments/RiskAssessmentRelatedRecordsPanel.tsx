import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Wrench } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { EmptyState } from '../EmptyState';
import { LoadingState } from '../LoadingState';
import { StatusBadge } from '../StatusBadge';
import { RiskBadge } from '../RiskBadge';
import { listCorrectiveActions } from '../../lib/correctiveActionsApi';
import type { CorrectiveAction } from '../../lib/correctiveActionTypes';
import type { RiskAssessment } from '../../lib/riskAssessmentTypes';

interface RiskAssessmentRelatedRecordsPanelProps {
  assessment: RiskAssessment;
}

export function RiskAssessmentRelatedRecordsPanel({ assessment }: RiskAssessmentRelatedRecordsPanelProps) {
  const [actions, setActions] = useState<CorrectiveAction[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    listCorrectiveActions({ riskAssessmentId: assessment.id })
      .then(({ items: linkedActions }) => {
        if (cancelled) return;
        setActions(linkedActions);
      })
      .catch(() => {
        if (!cancelled) setActions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [assessment.id]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SectionCard title="Source Hazard Report">
        {assessment.hazardId && assessment.hazardReferenceNumber ? (
          <Link
            to={`/hazards/${assessment.hazardId}`}
            className="flex items-center gap-3 rounded-md border border-border bg-canvas-raised p-3 transition-colors hover:border-accent/50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-500/10 text-muted">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted">{assessment.hazardReferenceNumber}</p>
              <p className="truncate text-sm font-medium text-heading">View originating hazard report</p>
            </div>
          </Link>
        ) : (
          <EmptyState
            icon={AlertTriangle}
            title="No source hazard"
            description="This risk assessment was not created from a hazard report."
          />
        )}
      </SectionCard>

      <SectionCard title="Corrective Actions">
        {actions === null ? (
          <LoadingState label="Loading…" />
        ) : actions.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No corrective action yet"
            description="Use Create Corrective Action to assign a fix for an additional control."
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
