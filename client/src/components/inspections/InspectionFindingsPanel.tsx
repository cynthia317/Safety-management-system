import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSearch } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { EmptyState } from '../EmptyState';
import { LoadingState } from '../LoadingState';
import { StatusBadge } from '../StatusBadge';
import { RiskBadge } from '../RiskBadge';
import { listFindings } from '../../lib/findingsApi';
import type { Finding } from '../../lib/findingTypes';

interface InspectionFindingsPanelProps {
  inspectionId: string;
}

/** Real Finding records created from this inspection's flagged responses — distinct from
 * the "Potential Findings" tab, which shows the still-in-progress JSON flags on each
 * response before they're turned into a Finding. */
export function InspectionFindingsPanel({ inspectionId }: InspectionFindingsPanelProps) {
  const [findings, setFindings] = useState<Finding[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    listFindings({ inspectionId })
      .then(({ items: linked }) => {
        if (cancelled) return;
        setFindings(linked);
      })
      .catch(() => {
        if (!cancelled) setFindings([]);
      });

    return () => {
      cancelled = true;
    };
  }, [inspectionId]);

  return (
    <SectionCard title="Findings" description="Real findings created from flagged responses in this inspection.">
      {findings === null ? (
        <LoadingState label="Loading…" />
      ) : findings.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No findings yet"
          description="Use Create Finding on a potential finding to record a confirmed issue."
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
  );
}
