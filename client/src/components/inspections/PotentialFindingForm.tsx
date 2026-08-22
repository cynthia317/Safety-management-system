import { AlertTriangle } from 'lucide-react';
import { FormField } from '../form/FormField';
import { Input } from '../form/Input';
import { Textarea } from '../form/Textarea';
import { RiskRatingControl } from './responses/RiskRatingControl';
import type { PotentialFinding } from '../../lib/inspectionTypes';
import type { RiskLevel } from '../../lib/hazardTypes';

const EMPTY_FINDING: Omit<PotentialFinding, 'id' | 'status'> = {
  title: '',
  description: '',
  riskLevel: 'Medium',
  recommendation: '',
  immediateAction: '',
};

interface PotentialFindingFormProps {
  finding: PotentialFinding | null;
  onChange: (finding: PotentialFinding) => void;
}

export function PotentialFindingForm({ finding, onChange }: PotentialFindingFormProps) {
  const current: PotentialFinding = finding ?? {
    id: `pf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    status: 'Potential',
    ...EMPTY_FINDING,
  };

  function setField<K extends keyof PotentialFinding>(key: K, value: PotentialFinding[K]) {
    onChange({ ...current, [key]: value });
  }

  return (
    <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3.5">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-400" strokeWidth={2} />
        <span className="text-xs font-semibold uppercase tracking-wide text-red-400">Potential Finding</span>
      </div>

      <div className="space-y-3">
        <FormField label="Observation / Finding Title" htmlFor={`${current.id}-title`} required>
          <Input
            id={`${current.id}-title`}
            value={current.title}
            placeholder="Short summary of the issue"
            onChange={(e) => setField('title', e.target.value)}
          />
        </FormField>

        <FormField label="Description" htmlFor={`${current.id}-description`}>
          <Textarea
            id={`${current.id}-description`}
            rows={2}
            value={current.description}
            placeholder="What was observed and why it is a concern"
            onChange={(e) => setField('description', e.target.value)}
          />
        </FormField>

        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Risk Level</p>
          <RiskRatingControl
            question={{
              id: current.id,
              text: '',
              guidance: '',
              referenceNote: '',
              responseType: 'risk_rating',
              options: [],
              required: false,
              evidenceRequired: false,
              allowFindingCreation: false,
              order: 0,
            }}
            value={current.riskLevel}
            onChange={(value) => setField('riskLevel', value as RiskLevel)}
          />
        </div>

        <FormField label="Recommendation" htmlFor={`${current.id}-recommendation`}>
          <Textarea
            id={`${current.id}-recommendation`}
            rows={2}
            value={current.recommendation}
            placeholder="What should be done to correct this"
            onChange={(e) => setField('recommendation', e.target.value)}
          />
        </FormField>

        <FormField label="Immediate Action Taken" htmlFor={`${current.id}-immediate`}>
          <Textarea
            id={`${current.id}-immediate`}
            rows={2}
            value={current.immediateAction}
            placeholder="Any action already taken to reduce risk"
            onChange={(e) => setField('immediateAction', e.target.value)}
          />
        </FormField>
      </div>
    </div>
  );
}
