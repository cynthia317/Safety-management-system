import { FormField } from '../../form/FormField';
import { Input } from '../../form/Input';
import { Textarea } from '../../form/Textarea';
import { Select } from '../../form/Select';
import { REPORT_TYPES } from '../../../lib/hazardOptions';
import type { HazardFormValues } from '../../../lib/hazardTypes';
import type { HazardFormErrors } from '../../../lib/hazardValidation';

interface ReportDetailsFieldsProps {
  values: HazardFormValues;
  errors: HazardFormErrors;
  onFieldChange: <K extends keyof HazardFormValues>(key: K, value: HazardFormValues[K]) => void;
}

export function ReportDetailsFields({ values, errors, onFieldChange }: ReportDetailsFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Report Type" htmlFor="reportType" required error={errors.reportType}>
        <Select
          id="reportType"
          value={values.reportType}
          invalid={!!errors.reportType}
          onChange={(e) => onFieldChange('reportType', e.target.value as HazardFormValues['reportType'])}
        >
          <option value="">Select report type…</option>
          {REPORT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Title" htmlFor="title" required error={errors.title} hint="A short, specific summary.">
        <Input
          id="title"
          value={values.title}
          maxLength={160}
          invalid={!!errors.title}
          placeholder="e.g. Blocked emergency exit in Warehouse B"
          onChange={(e) => onFieldChange('title', e.target.value)}
        />
      </FormField>

      <div className="sm:col-span-2">
        <FormField label="Description" htmlFor="description" required error={errors.description}>
          <Textarea
            id="description"
            value={values.description}
            invalid={!!errors.description}
            placeholder="Describe what was observed, where, and any relevant context."
            onChange={(e) => onFieldChange('description', e.target.value)}
          />
        </FormField>
      </div>
    </div>
  );
}
