import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { FormField } from '../form/FormField';
import { Input } from '../form/Input';
import { Textarea } from '../form/Textarea';
import { Button } from '../Button';
import { RiskScaleSelect } from './RiskScaleSelect';
import { RiskMatrixBadge } from './RiskMatrixBadge';
import { computeRiskLevel, computeRiskScore, LIKELIHOOD_LABELS, SEVERITY_LABELS } from '../../lib/riskMatrix';
import type { RiskAssessmentItemInput } from '../../lib/riskAssessmentTypes';

interface RiskItemEditorProps {
  item: RiskAssessmentItemInput;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (item: RiskAssessmentItemInput) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

export function RiskItemEditor({ item, index, canMoveUp, canMoveDown, onChange, onMoveUp, onMoveDown, onDelete }: RiskItemEditorProps) {
  function setField<K extends keyof RiskAssessmentItemInput>(key: K, value: RiskAssessmentItemInput[K]) {
    onChange({ ...item, [key]: value });
  }

  const initialScore = computeRiskScore(item.likelihood, item.severity);
  const initialLevel = computeRiskLevel(initialScore);
  const hasResidual = item.residualLikelihood !== null && item.residualSeverity !== null;
  const residualScore = hasResidual ? computeRiskScore(item.residualLikelihood as number, item.residualSeverity as number) : null;
  const residualLevel = residualScore !== null ? computeRiskLevel(residualScore) : null;

  return (
    <div className="rounded-md border border-border bg-canvas-raised p-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[11px] font-semibold text-muted">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <FormField label="Hazard / Task" htmlFor={`ri-${index}-hazard`} required>
            <Textarea
              id={`ri-${index}-hazard`}
              rows={2}
              value={item.hazard}
              placeholder="e.g. Entanglement at the in-feed roller pinch point"
              onChange={(e) => setField('hazard', e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Who Might Be Harmed" htmlFor={`ri-${index}-who`} hint="Optional.">
              <Textarea
                id={`ri-${index}-who`}
                rows={2}
                value={item.whoMightBeHarmed}
                onChange={(e) => setField('whoMightBeHarmed', e.target.value)}
              />
            </FormField>
            <FormField label="Existing Controls" htmlFor={`ri-${index}-existing`} hint="Optional — controls already in place.">
              <Textarea
                id={`ri-${index}-existing`}
                rows={2}
                value={item.existingControls}
                onChange={(e) => setField('existingControls', e.target.value)}
              />
            </FormField>
          </div>

          <div className="rounded-md border border-border bg-surface p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Initial Risk</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Likelihood" htmlFor={`ri-${index}-likelihood`}>
                <RiskScaleSelect
                  id={`ri-${index}-likelihood`}
                  value={item.likelihood}
                  labels={LIKELIHOOD_LABELS}
                  onChange={(v) => setField('likelihood', v ?? 1)}
                />
              </FormField>
              <FormField label="Severity" htmlFor={`ri-${index}-severity`}>
                <RiskScaleSelect
                  id={`ri-${index}-severity`}
                  value={item.severity}
                  labels={SEVERITY_LABELS}
                  onChange={(v) => setField('severity', v ?? 1)}
                />
              </FormField>
            </div>
            <div className="mt-2">
              <RiskMatrixBadge score={initialScore} level={initialLevel} />
            </div>
          </div>

          <FormField label="Additional Controls" htmlFor={`ri-${index}-additional`} hint="Optional — further action to reduce the risk.">
            <Textarea
              id={`ri-${index}-additional`}
              rows={2}
              value={item.additionalControls}
              onChange={(e) => setField('additionalControls', e.target.value)}
            />
          </FormField>

          <div className="rounded-md border border-border bg-surface p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Residual Risk <span className="normal-case text-muted">(after additional controls, optional)</span>
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Likelihood" htmlFor={`ri-${index}-res-likelihood`}>
                <RiskScaleSelect
                  id={`ri-${index}-res-likelihood`}
                  value={item.residualLikelihood}
                  labels={LIKELIHOOD_LABELS}
                  allowUnset
                  onChange={(v) => setField('residualLikelihood', v)}
                />
              </FormField>
              <FormField label="Severity" htmlFor={`ri-${index}-res-severity`}>
                <RiskScaleSelect
                  id={`ri-${index}-res-severity`}
                  value={item.residualSeverity}
                  labels={SEVERITY_LABELS}
                  allowUnset
                  onChange={(v) => setField('residualSeverity', v)}
                />
              </FormField>
            </div>
            {residualScore !== null && residualLevel !== null && (
              <div className="mt-2">
                <RiskMatrixBadge score={residualScore} level={residualLevel} />
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <Button variant="ghost" className="h-7 w-7 p-0" disabled={!canMoveUp} onClick={onMoveUp} aria-label="Move item up">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="h-7 w-7 p-0" disabled={!canMoveDown} onClick={onMoveDown} aria-label="Move item down">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10" onClick={onDelete} aria-label="Delete item">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
