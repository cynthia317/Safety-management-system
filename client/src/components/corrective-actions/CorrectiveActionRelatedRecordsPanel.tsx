import { Link } from 'react-router-dom';
import { AlertTriangle, ClipboardList, FileSearch, ShieldAlert } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { EmptyState } from '../EmptyState';
import type { CorrectiveAction } from '../../lib/correctiveActionTypes';

interface CorrectiveActionRelatedRecordsPanelProps {
  action: CorrectiveAction;
}

// Mirrors the precedence in CorrectiveActionSourceBadge — findingId/hazardId/inspectionId/
// riskAssessmentId are mutually exclusive (enforced server-side), so at most one branch
// here ever has a value.
export function CorrectiveActionRelatedRecordsPanel({ action }: CorrectiveActionRelatedRecordsPanelProps) {
  const source =
    action.findingId && action.findingReferenceNumber
      ? { label: 'Finding', icon: FileSearch, to: `/findings/${action.findingId}`, ref: action.findingReferenceNumber }
      : action.hazardId && action.hazardReferenceNumber
        ? { label: 'Hazard Report', icon: AlertTriangle, to: `/hazards/${action.hazardId}`, ref: action.hazardReferenceNumber }
        : action.inspectionId && action.inspectionReferenceNumber
          ? { label: 'Inspection', icon: ClipboardList, to: `/inspections/${action.inspectionId}`, ref: action.inspectionReferenceNumber }
          : action.riskAssessmentId && action.riskAssessmentReferenceNumber
            ? {
                label: 'Risk Assessment',
                icon: ShieldAlert,
                to: `/risk-assessments/${action.riskAssessmentId}`,
                ref: action.riskAssessmentReferenceNumber,
              }
            : null;

  return (
    <SectionCard title={source ? `Source ${source.label}` : 'Source'}>
      {source ? (
        <Link
          to={source.to}
          className="flex items-center gap-3 rounded-md border border-border bg-canvas-raised p-3 transition-colors hover:border-accent/50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-500/10 text-muted">
            <source.icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted">{source.ref}</p>
            <p className="truncate text-sm font-medium text-heading">View originating {source.label.toLowerCase()}</p>
          </div>
        </Link>
      ) : (
        <EmptyState
          icon={FileSearch}
          title="No linked source record"
          description={
            action.externalSourceReference
              ? `External source reference: ${action.externalSourceReference}`
              : 'This corrective action was entered manually, with no source record.'
          }
        />
      )}
    </SectionCard>
  );
}
