import { Link } from 'react-router-dom';
import { FileSearch } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { EmptyState } from '../EmptyState';
import type { CorrectiveAction } from '../../lib/correctiveActionTypes';

interface CorrectiveActionRelatedRecordsPanelProps {
  action: CorrectiveAction;
}

export function CorrectiveActionRelatedRecordsPanel({ action }: CorrectiveActionRelatedRecordsPanelProps) {
  return (
    <SectionCard title="Source Finding">
      {action.findingId && action.findingReferenceNumber ? (
        <Link
          to={`/findings/${action.findingId}`}
          className="flex items-center gap-3 rounded-md border border-border bg-canvas-raised p-3 transition-colors hover:border-accent/50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-500/10 text-muted">
            <FileSearch className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted">{action.findingReferenceNumber}</p>
            <p className="truncate text-sm font-medium text-heading">View originating finding</p>
          </div>
        </Link>
      ) : (
        <EmptyState
          icon={FileSearch}
          title="No source finding"
          description="This corrective action was not created from a finding."
        />
      )}
    </SectionCard>
  );
}
