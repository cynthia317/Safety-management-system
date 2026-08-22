import { FormField } from '../../form/FormField';
import { Textarea } from '../../form/Textarea';
import { Select } from '../../form/Select';
import { HAZARD_CATEGORIES, RISK_LEVELS } from '../../../lib/hazardOptions';
import type { HazardFormValues } from '../../../lib/hazardTypes';
import type { HazardFormErrors } from '../../../lib/hazardValidation';

interface RiskFieldsProps {
  values: HazardFormValues;
  errors: HazardFormErrors;
  onFieldChange: <K extends keyof HazardFormValues>(key: K, value: HazardFormValues[K]) => void;
}

export function RiskFields({ values, errors, onFieldChange }: RiskFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Hazard Category" htmlFor="hazardCategory" required error={errors.hazardCategory}>
        <Select
          id="hazardCategory"
          value={values.hazardCategory}
          invalid={!!errors.hazardCategory}
          onChange={(e) => onFieldChange('hazardCategory', e.target.value as HazardFormValues['hazardCategory'])}
        >
          <option value="">Select category…</option>
          {HAZARD_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Risk Level" htmlFor="riskLevel" required error={errors.riskLevel}>
        <Select
          id="riskLevel"
          value={values.riskLevel}
          invalid={!!errors.riskLevel}
          onChange={(e) => onFieldChange('riskLevel', e.target.value as HazardFormValues['riskLevel'])}
        >
          <option value="">Select risk level…</option>
          {RISK_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="sm:col-span-2">
        <FormField
          label="People Potentially Affected"
          htmlFor="peopleAtRisk"
          required
          error={errors.peopleAtRisk}
          hint="Who could be harmed, and roughly how many."
        >
          <Textarea
            id="peopleAtRisk"
            rows={2}
            value={values.peopleAtRisk}
            invalid={!!errors.peopleAtRisk}
            placeholder="e.g. Warehouse staff on shift (approx. 15 people)"
            onChange={(e) => onFieldChange('peopleAtRisk', e.target.value)}
          />
        </FormField>
      </div>
    </div>
  );
}
