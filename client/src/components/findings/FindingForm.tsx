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
import { useWorkplaceSuggestions } from '../../lib/useWorkplaceSuggestions';
import { useAuth } from '../../lib/AuthContext';
import { useUsers } from '../../lib/useUsers';
import {
  EMPTY_FINDING_FORM_VALUES,
  validateFindingForm,
  type FindingFormErrors,
} from '../../lib/findingValidation';
import type { FindingFormValues } from '../../lib/findingTypes';
import type { RiskLevel } from '../../lib/hazardTypes';

export interface ValidatedFindingFormData {
  title: string;
  description: string;
  workplace: string;
  department: string;
  location: string;
  riskLevel: RiskLevel;
  dueDate: string;
  createdBy: string;
  assignedTo: string;
}

export interface FindingHazardContext {
  id: string;
  referenceNumber: string;
  title: string;
}

export interface FindingSourceContext {
  kind: 'hazard' | 'inspection';
  id: string;
  referenceNumber: string;
  title: string;
}

interface FindingFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<FindingFormValues>;
  sourceContext?: FindingSourceContext | null;
  submitLabel: string;
  onSubmit: (data: ValidatedFindingFormData) => Promise<void>;
  onCancel: () => void;
}

export function FindingForm({
  initialValues,
  sourceContext,
  submitLabel,
  onSubmit,
  onCancel,
}: FindingFormProps) {
  const { user } = useAuth();
  const users = useUsers();
  const [values, setValues] = useState<FindingFormValues>({
    ...EMPTY_FINDING_FORM_VALUES,
    createdBy: user?.name ?? '',
    ...initialValues,
  });
  const [errors, setErrors] = useState<FindingFormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { workplaces, departments } = useWorkplaceSuggestions();

  function setField<K extends keyof FindingFormValues>(key: K, value: FindingFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateFindingForm(values);

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
        riskLevel: values.riskLevel as RiskLevel,
        dueDate: values.dueDate,
        createdBy: values.createdBy.trim(),
        assignedTo: values.assignedTo,
      });
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(err.details as FindingFormErrors);
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
            Linked to {sourceContext.kind === 'hazard' ? 'hazard report' : 'inspection'}{' '}
            <Link
              to={sourceContext.kind === 'hazard' ? `/hazards/${sourceContext.id}` : `/inspections/${sourceContext.id}`}
              className="font-medium underline hover:no-underline"
            >
              {sourceContext.referenceNumber}
            </Link>{' '}
            &mdash; {sourceContext.title}
          </span>
        </div>
      )}

      <SectionCard title="Finding Details" description="What was confirmed and why it matters.">
        <div className="grid grid-cols-1 gap-4">
          <FormField label="Title" htmlFor="finding-title" required error={errors.title} hint="A short, specific summary.">
            <Input
              id="finding-title"
              value={values.title}
              maxLength={160}
              invalid={!!errors.title}
              placeholder="e.g. Missing machine guard on Press #3"
              onChange={(e) => setField('title', e.target.value)}
            />
          </FormField>
          <FormField label="Description" htmlFor="finding-description" required error={errors.description}>
            <Textarea
              id="finding-description"
              value={values.description}
              invalid={!!errors.description}
              placeholder="Describe the confirmed issue and any relevant context."
              onChange={(e) => setField('description', e.target.value)}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Location" description="Where this finding applies.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Workplace" htmlFor="finding-workplace" required error={errors.workplace}>
            <Input
              id="finding-workplace"
              list="finding-workplace-suggestions"
              value={values.workplace}
              invalid={!!errors.workplace}
              placeholder="e.g. Main Plant"
              onChange={(e) => setField('workplace', e.target.value)}
            />
            <datalist id="finding-workplace-suggestions">
              {workplaces.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
          </FormField>
          <FormField label="Department" htmlFor="finding-department" required error={errors.department}>
            <Input
              id="finding-department"
              list="finding-department-suggestions"
              value={values.department}
              invalid={!!errors.department}
              placeholder="e.g. Warehouse B"
              onChange={(e) => setField('department', e.target.value)}
            />
            <datalist id="finding-department-suggestions">
              {departments.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </FormField>
          <FormField label="Specific Location" htmlFor="finding-location" required error={errors.location}>
            <Input
              id="finding-location"
              value={values.location}
              invalid={!!errors.location}
              placeholder="Specific area or equipment"
              onChange={(e) => setField('location', e.target.value)}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Risk & Timeline" description="Severity and when this needs to be resolved by.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Risk Level" htmlFor="finding-risk" required error={errors.riskLevel}>
            <Select
              id="finding-risk"
              value={values.riskLevel}
              invalid={!!errors.riskLevel}
              onChange={(e) => setField('riskLevel', e.target.value as FindingFormValues['riskLevel'])}
            >
              <option value="">Select risk level…</option>
              {RISK_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Due Date" htmlFor="finding-due-date" required error={errors.dueDate}>
            <Input
              id="finding-due-date"
              type="date"
              value={values.dueDate}
              invalid={!!errors.dueDate}
              onChange={(e) => setField('dueDate', e.target.value)}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Assignment" description="Who created this finding and who owns it.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Created By" htmlFor="finding-created-by" required error={errors.createdBy} hint="You, from your signed-in account.">
            <Input id="finding-created-by" value={values.createdBy} disabled />
          </FormField>
          <FormField label="Assigned Safety Officer" htmlFor="finding-assigned-to" hint="Optional — can be assigned later.">
            <Select
              id="finding-assigned-to"
              value={values.assignedTo}
              onChange={(e) => setField('assignedTo', e.target.value)}
            >
              <option value="">Unassigned</option>
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
