import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { EmptyState } from '../EmptyState';
import { LoadingState } from '../LoadingState';
import { StatusBadge } from '../StatusBadge';
import { RiskBadge } from '../RiskBadge';
import { listCorrectiveActions } from '../../lib/correctiveActionsApi';
import type { CorrectiveAction } from '../../lib/correctiveActionTypes';

interface InspectionCorrectiveActionsPanelProps {
  inspectionId: string;
}

export function InspectionCorrectiveActionsPanel({ inspectionId }: InspectionCorrectiveActionsPanelProps) {
  const [actions, setActions] = useState<CorrectiveAction[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    listCorrectiveActions({ inspectionId })
      .then(({ items: linked }) => {
        if (cancelled) return;
        setActions(linked);
      })
      .catch(() => {
        if (!cancelled) setActions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [inspectionId]);

  return (
    <SectionCard title="Corrective Actions" description="Fixes created directly from this inspection's findings.">
      {actions === null ? (
        <LoadingState label="Loading…" />
      ) : actions.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No corrective actions yet"
          description="Use Create Corrective Action on a potential finding to assign a fix."
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
  );
}
