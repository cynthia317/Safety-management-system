import { AlertTriangle, ArrowRight } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { RiskMatrixBadge } from './RiskMatrixBadge';
import type { RiskAssessmentItem } from '../../lib/riskAssessmentTypes';

interface RiskItemsViewProps {
  items: RiskAssessmentItem[];
}

export function RiskItemsView({ items }: RiskItemsViewProps) {
  if (items.length === 0) {
    return <EmptyState icon={AlertTriangle} title="No risk items" description="Edit this assessment to add scored risk items." />;
  }

  return (
    <div className="space-y-3">
      {items
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((item, index) => {
          const hasResidual = item.residualRiskLevel !== null && item.residualRiskScore !== null;
          return (
            <div key={item.id} className="rounded-md border border-border bg-surface p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-semibold text-muted">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2.5">
                  <p className="text-sm font-medium text-heading">{item.hazard}</p>

                  {item.whoMightBeHarmed && (
                    <p className="text-xs text-muted">
                      <span className="font-medium text-body">Who might be harmed:</span> {item.whoMightBeHarmed}
                    </p>
                  )}
                  {item.existingControls && (
                    <p className="text-xs text-muted">
                      <span className="font-medium text-body">Existing controls:</span> {item.existingControls}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <RiskMatrixBadge score={item.riskScore} level={item.riskLevel} label="Initial" />
                    {hasResidual && (
                      <>
                        <ArrowRight className="h-3.5 w-3.5 text-muted" />
                        <RiskMatrixBadge score={item.residualRiskScore as number} level={item.residualRiskLevel!} label="Residual" />
                      </>
                    )}
                  </div>

                  {item.additionalControls && (
                    <p className="text-xs text-muted">
                      <span className="font-medium text-body">Additional controls:</span> {item.additionalControls}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}
