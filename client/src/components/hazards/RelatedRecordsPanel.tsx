import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSearch, ShieldAlert, Wrench } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { EmptyState } from '../EmptyState';
import { LoadingState } from '../LoadingState';
import { StatusBadge } from '../StatusBadge';
import { RiskBadge } from '../RiskBadge';
import { listFindings } from '../../lib/findingsApi';
import { listCorrectiveActions } from '../../lib/correctiveActionsApi';
import { listRiskAssessments } from '../../lib/riskAssessmentsApi';
import type { Finding } from '../../lib/findingTypes';
import type { CorrectiveAction } from '../../lib/correctiveActionTypes';
import type { RiskAssessment } from '../../lib/riskAssessmentTypes';

interface RelatedRecordsPanelProps {
  hazardId: string;
}

export function RelatedRecordsPanel({ hazardId }: RelatedRecordsPanelProps) {
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [actions, setActions] = useState<CorrectiveAction[] | null>(null);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    listFindings({ hazardId })
      .then(({ items: linkedFindings }) => {
        if (cancelled) return;
        setFindings(linkedFindings);

        const findingIds = linkedFindings.map((f) => f.id);
        return listCorrectiveActions({ hazardId, findingId: findingIds }).then(({ items: linkedActions }) => {
          if (cancelled) return;
          setActions(linkedActions);
        });
      })
      .catch(() => {
        if (!cancelled) {
          setFindings([]);
          setActions([]);
        }
      });

    listRiskAssessments({ hazardId })
      .then(({ items: linked }) => {
        if (!cancelled) setRiskAssessments(linked);
      })
      .catch(() => {
        if (!cancelled) setRiskAssessments([]);
      });

    return () => {
      cancelled = true;
    };
  }, [hazardId]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <SectionCard title="Finding">
        {findings === null ? (
          <LoadingState label="Loading…" />
        ) : findings.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No finding created yet"
            description="Use the Create Finding action above to turn this hazard into a formal finding."
          />
        ) : (
          <ul className="space-y-2">
            {findings.map((finding) => (
              <li key={finding.id}>
                <Link
                  to={`/findings/${finding.id}`}
                  className="flex items-center gap-3 rounded-md border border-border bg-canvas-raised p-3 transition-colors hover:border-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-muted">{finding.referenceNumber}</p>
                    <p className="truncate text-sm font-medium text-heading">{finding.title}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <RiskBadge level={finding.riskLevel} />
                    <StatusBadge status={finding.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Corrective Action">
        {actions === null ? (
          <LoadingState label="Loading…" />
        ) : actions.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No corrective action yet"
            description="Corrective actions linked to findings from this hazard will appear here."
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

      <SectionCard title="Risk Assessment">
        {riskAssessments === null ? (
          <LoadingState label="Loading…" />
        ) : riskAssessments.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No risk assessment yet"
            description="Use Create Risk Assessment above to assess risk following this hazard."
          />
        ) : (
          <ul className="space-y-2">
            {riskAssessments.map((assessment) => (
              <li key={assessment.id}>
                <Link
                  to={`/risk-assessments/${assessment.id}`}
                  className="flex items-center gap-3 rounded-md border border-border bg-canvas-raised p-3 transition-colors hover:border-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-muted">{assessment.referenceNumber}</p>
                    <p className="truncate text-sm font-medium text-heading">{assessment.title}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <RiskBadge level={assessment.overallRiskLevel} />
                    <StatusBadge status={assessment.status} />
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
