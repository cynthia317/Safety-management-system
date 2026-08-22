import { useState, type FormEvent } from 'react';
import { SectionCard } from '../SectionCard';
import { Button } from '../Button';
import { FormField } from '../form/FormField';
import { Textarea } from '../form/Textarea';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { EMPTY_HAZARD_FORM_VALUES, validateHazardForm, type HazardFormErrors } from '../../lib/hazardValidation';
import { ReportDetailsFields } from './fields/ReportDetailsFields';
import { LocationFields } from './fields/LocationFields';
import { RiskFields } from './fields/RiskFields';
import { AssignmentFields } from './fields/AssignmentFields';
import type { HazardCategory, HazardFormValues, ReportType, RiskLevel } from '../../lib/hazardTypes';

export interface ValidatedHazardFormData {
  title: string;
  description: string;
  reportType: ReportType;
  hazardCategory: HazardCategory;
  workplace: string;
  department: string;
  location: string;
  peopleAtRisk: string;
  immediateActionTaken: string;
  riskLevel: RiskLevel;
  reportedBy: string;
  assignedTo: string;
}

interface HazardFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<HazardFormValues>;
  submitLabel: string;
  onSubmit: (data: ValidatedHazardFormData) => Promise<void>;
  onCancel: () => void;
}

export function HazardForm({ initialValues, submitLabel, onSubmit, onCancel }: HazardFormProps) {
  const { user } = useAuth();
  const [values, setValues] = useState<HazardFormValues>({
    ...EMPTY_HAZARD_FORM_VALUES,
    reportedBy: user?.name ?? '',
    ...initialValues,
  });
  const [errors, setErrors] = useState<HazardFormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setField<K extends keyof HazardFormValues>(key: K, value: HazardFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateHazardForm(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setGeneralError(null);

    try {
      await onSubmit({
        title: values.title.trim(),
        description: values.description.trim(),
        reportType: values.reportType as ReportType,
        hazardCategory: values.hazardCategory as HazardCategory,
        workplace: values.workplace,
        department: values.department,
        location: values.location.trim(),
        peopleAtRisk: values.peopleAtRisk.trim(),
        immediateActionTaken: values.immediateActionTaken.trim(),
        riskLevel: values.riskLevel as RiskLevel,
        reportedBy: values.reportedBy.trim(),
        assignedTo: values.assignedTo,
      });
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(err.details as HazardFormErrors);
        setGeneralError(err.message);
      } else {
        setGeneralError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {generalError && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {generalError}
        </div>
      )}

      <SectionCard title="Report Details" description="What happened and what type of report this is.">
        <ReportDetailsFields values={values} errors={errors} onFieldChange={setField} />
      </SectionCard>

      <SectionCard title="Location" description="Where the hazard was observed.">
        <LocationFields values={values} errors={errors} onFieldChange={setField} />
      </SectionCard>

      <SectionCard title="Risk Information" description="Category, who may be affected, and severity.">
        <RiskFields values={values} errors={errors} onFieldChange={setField} />
      </SectionCard>

      <SectionCard title="Immediate Response" description="Any action already taken to reduce risk.">
        <FormField
          label="Immediate Action Taken"
          htmlFor="immediateActionTaken"
          error={errors.immediateActionTaken}
          hint="Optional — leave blank if no action has been taken yet."
        >
          <Textarea
            id="immediateActionTaken"
            rows={3}
            value={values.immediateActionTaken}
            invalid={!!errors.immediateActionTaken}
            placeholder="e.g. Area cordoned off and warning signage placed."
            onChange={(e) => setField('immediateActionTaken', e.target.value)}
          />
        </FormField>
      </SectionCard>

      <SectionCard title="Assignment" description="Who reported this and who should own it.">
        <AssignmentFields values={values} errors={errors} onFieldChange={setField} />
      </SectionCard>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
