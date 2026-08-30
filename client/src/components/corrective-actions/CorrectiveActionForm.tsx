import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { Button } from '../Button';
import { FormField } from '../form/FormField';
import { Input } from '../form/Input';
import { Textarea } from '../form/Textarea';
import { Select } from '../form/Select';
import { ApiError } from '../../lib/api';
import { RISK_LEVELS } from '../../lib/hazardOptions';
import { CORRECTIVE_ACTION_SOURCE_TYPES, EXTERNAL_ONLY_SOURCE_TYPES } from '../../lib/correctiveActionOptions';
import { useWorkplaceSuggestions } from '../../lib/useWorkplaceSuggestions';
import { useAuth } from '../../lib/AuthContext';
import { useUsers } from '../../lib/useUsers';
import {
  EMPTY_CORRECTIVE_ACTION_FORM_VALUES,
  validateCorrectiveActionForm,
  type CorrectiveActionFormErrors,
} from '../../lib/correctiveActionValidation';
import type { CorrectiveActionFormValues, CorrectiveActionSourceType } from '../../lib/correctiveActionTypes';
import type { RiskLevel } from '../../lib/hazardTypes';

export interface ValidatedCorrectiveActionFormData {
  title: string;
  description: string;
  workplace: string;
  department: string;
  location: string;
  priority: RiskLevel;
  dueDate: string;
  createdBy: string;
  assignedTo: string;
  sourceType: CorrectiveActionSourceType;
  externalSourceReference: string;
}

export interface CorrectiveActionSourceContext {
  kind: 'hazard' | 'finding' | 'inspection' | 'riskAssessment' | 'incident';
  id: string;
  referenceNumber: string;
  title: string;
}

const SOURCE_CONTEXT_PATHS: Record<CorrectiveActionSourceContext['kind'], string> = {
  hazard: 'hazards',
  finding: 'findings',
  inspection: 'inspections',
  riskAssessment: 'risk-assessments',
  incident: 'incidents',
};

interface CorrectiveActionFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<CorrectiveActionFormValues>;
  sourceContext?: CorrectiveActionSourceContext | null;
  submitLabel: string;
  onSubmit: (data: ValidatedCorrectiveActionFormData) => Promise<void>;
  onCancel: () => void;
}

export function CorrectiveActionForm({
  mode,
  initialValues,
  sourceContext,
  submitLabel,
  onSubmit,
  onCancel,
}: CorrectiveActionFormProps) {
  const { user } = useAuth();
  const users = useUsers();
  const [values, setValues] = useState<CorrectiveActionFormValues>({
    ...EMPTY_CORRECTIVE_ACTION_FORM_VALUES,
    createdBy: user?.name ?? '',
    ...initialValues,
  });
  const [errors, setErrors] = useState<CorrectiveActionFormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { workplaces, departments } = useWorkplaceSuggestions();

  function setField<K extends keyof CorrectiveActionFormValues>(key: K, value: CorrectiveActionFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateCorrectiveActionForm(values);

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
        workplace: values.workplace.trim(),
        department: values.department.trim(),
        location: values.location.trim(),
        priority: values.priority as RiskLevel,
        dueDate: values.dueDate,
        createdBy: values.createdBy.trim(),
        assignedTo: values.assignedTo.trim(),
        sourceType: values.sourceType,
        externalSourceReference: values.externalSourceReference.trim(),
      });
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(err.details as CorrectiveActionFormErrors);
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

      {sourceContext && (
        <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Linked to {sourceContext.kind}{' '}
            <Link
              to={`/${SOURCE_CONTEXT_PATHS[sourceContext.kind]}/${sourceContext.id}`}
              className="font-medium underline hover:no-underline"
            >
              {sourceContext.referenceNumber}
            </Link>{' '}
            &mdash; {sourceContext.title}
          </span>
        </div>
      )}

      {!sourceContext && mode === 'create' && (
        <SectionCard title="Source" description="Where this corrective action came from.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Source Type" htmlFor="ca-source-type" required>
              <Select
                id="ca-source-type"
                value={values.sourceType}
                onChange={(e) => setField('sourceType', e.target.value as CorrectiveActionFormValues['sourceType'])}
              >
                {CORRECTIVE_ACTION_SOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </FormField>
            {EXTERNAL_ONLY_SOURCE_TYPES.includes(values.sourceType) && (
              <FormField
                label="Reference"
                htmlFor="ca-external-reference"
                hint={`${values.sourceType} isn't tracked as a module yet — enter its reference number.`}
              >
                <Input
                  id="ca-external-reference"
                  value={values.externalSourceReference}
                  placeholder="e.g. AUD-014"
                  onChange={(e) => setField('externalSourceReference', e.target.value)}
                />
              </FormField>
            )}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Corrective Action Details" description="What needs to be done and why it matters.">
        <div className="grid grid-cols-1 gap-4">
          <FormField label="Title" htmlFor="ca-title" required error={errors.title} hint="A short, specific summary.">
            <Input
              id="ca-title"
              value={values.title}
              maxLength={160}
              invalid={!!errors.title}
              placeholder="e.g. Install fixed guard on Press #3 in-feed roller"
              onChange={(e) => setField('title', e.target.value)}
            />
          </FormField>
          <FormField label="Description" htmlFor="ca-description" required error={errors.description}>
            <Textarea
              id="ca-description"
              value={values.description}
              invalid={!!errors.description}
              placeholder="Describe what needs to be corrected and any relevant context."
              onChange={(e) => setField('description', e.target.value)}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Location" description="Where this corrective action applies.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Workplace" htmlFor="ca-workplace" required error={errors.workplace}>
            <Input
              id="ca-workplace"
              list="ca-workplace-suggestions"
              value={values.workplace}
              invalid={!!errors.workplace}
              placeholder="e.g. Main Plant"
              onChange={(e) => setField('workplace', e.target.value)}
            />
            <datalist id="ca-workplace-suggestions">
              {workplaces.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
          </FormField>
          <FormField label="Department" htmlFor="ca-department" required error={errors.department}>
            <Input
              id="ca-department"
              list="ca-department-suggestions"
              value={values.department}
              invalid={!!errors.department}
              placeholder="e.g. Warehouse B"
              onChange={(e) => setField('department', e.target.value)}
            />
            <datalist id="ca-department-suggestions">
              {departments.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </FormField>
          <FormField label="Specific Location" htmlFor="ca-location" required error={errors.location}>
            <Input
              id="ca-location"
              value={values.location}
              invalid={!!errors.location}
              placeholder="Specific area or equipment"
              onChange={(e) => setField('location', e.target.value)}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Priority & Timeline" description="Severity and when this needs to be resolved by.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Priority" htmlFor="ca-priority" required error={errors.priority}>
            <Select
              id="ca-priority"
              value={values.priority}
              invalid={!!errors.priority}
              onChange={(e) => setField('priority', e.target.value as CorrectiveActionFormValues['priority'])}
            >
              <option value="">Select priority…</option>
              {RISK_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Due Date" htmlFor="ca-due-date" required error={errors.dueDate}>
            <Input
              id="ca-due-date"
              type="date"
              value={values.dueDate}
              invalid={!!errors.dueDate}
              onChange={(e) => setField('dueDate', e.target.value)}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Assignment" description="Who created this and who is responsible for fixing it.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Created By" htmlFor="ca-created-by" required error={errors.createdBy} hint="You, from your signed-in account.">
            <Input id="ca-created-by" value={values.createdBy} disabled />
          </FormField>
          <FormField label="Responsible Person" htmlFor="ca-assigned-to" required error={errors.assignedTo}>
            <Select
              id="ca-assigned-to"
              value={values.assignedTo}
              invalid={!!errors.assignedTo}
              onChange={(e) => setField('assignedTo', e.target.value)}
            >
              <option value="">Select responsible person…</option>
              {users.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name} &middot; {u.role}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
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
