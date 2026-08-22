import { FileQuestion } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { Button } from '../Button';
import { RiskBadge } from '../RiskBadge';
import { getPotentialFindings } from '../../lib/inspectionProgress';
import type { InspectionDetail } from '../../lib/inspectionTypes';

const STATUS_LABEL: Record<string, string> = {
  Potential: 'Potential',
  Dismissed: 'Dismissed',
  Created: 'Finding Created',
};

interface PotentialFindingsPanelProps {
  inspection: InspectionDetail;
  onCreateFinding: (questionId: string) => void;
  onCreateCorrectiveAction: (questionId: string) => void;
  onDismiss: (questionId: string) => void;
}

export function PotentialFindingsPanel({ inspection, onCreateFinding, onCreateCorrectiveAction, onDismiss }: PotentialFindingsPanelProps) {
  const findings = getPotentialFindings(inspection);

  if (findings.length === 0) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="No potential findings"
        description="No non-compliant responses have been flagged as potential findings for this inspection."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {findings.map(({ finding, response, question, sectionTitle }) => (
        <li key={finding.id} className="rounded-md border border-border bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-red-400">Potential Finding</span>
                <RiskBadge level={finding.riskLevel} />
                <span className="text-xs text-muted">{STATUS_LABEL[finding.status]}</span>
              </div>
              <p className="mt-1.5 text-sm font-medium text-heading">{finding.title}</p>
              <p className="text-xs text-muted">
                {sectionTitle} &middot; {question.text}
              </p>
            </div>
          </div>

          {finding.description && <p className="mt-2 text-sm text-body">{finding.description}</p>}
          {finding.recommendation && (
            <p className="mt-2 text-sm text-body">
              <span className="font-medium text-heading">Recommendation:</span> {finding.recommendation}
            </p>
          )}
          {finding.immediateAction && (
            <p className="mt-1 text-sm text-body">
              <span className="font-medium text-heading">Immediate action:</span> {finding.immediateAction}
            </p>
          )}
          {response.evidenceNote && (
            <p className="mt-1 text-sm text-muted">
              <span className="font-medium text-heading">Evidence:</span> {response.evidenceNote}
            </p>
          )}

          {finding.status === 'Potential' && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
              <Button variant="primary" className="text-xs" onClick={() => onCreateFinding(question.id)}>
                Create Finding
              </Button>
              <Button variant="secondary" className="text-xs" onClick={() => onCreateCorrectiveAction(question.id)}>
                Create Corrective Action
              </Button>
              <Button variant="secondary" className="text-xs" onClick={() => onDismiss(question.id)}>
                Dismiss
              </Button>
              <Button
                variant="ghost"
                className="text-xs"
                disabled
                title="Merging potential findings will be available in a future update."
              >
                Merge
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
