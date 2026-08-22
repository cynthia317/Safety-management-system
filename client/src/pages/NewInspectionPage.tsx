import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Button } from '../components/Button';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { FormField } from '../components/form/FormField';
import { Input } from '../components/form/Input';
import { Textarea } from '../components/form/Textarea';
import { Select } from '../components/form/Select';
import { listTemplates } from '../lib/inspectionTemplatesApi';
import { createInspection } from '../lib/inspectionsApi';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { useWorkplaceSuggestions } from '../lib/useWorkplaceSuggestions';
import { useAuth } from '../lib/AuthContext';
import { useUsers } from '../lib/useUsers';
import { ClipboardList } from 'lucide-react';
import type { InspectionTemplate } from '../lib/inspectionTemplateTypes';

interface FormValues {
  templateId: string;
  title: string;
  organisation: string;
  workplace: string;
  area: string;
  specificLocation: string;
  inspectionDate: string;
  leadInspector: string;
  additionalInspectors: string;
  purpose: string;
  scope: string;
}

const EMPTY_VALUES: FormValues = {
  templateId: '',
  title: '',
  organisation: '',
  workplace: '',
  area: '',
  specificLocation: '',
  inspectionDate: new Date().toISOString().slice(0, 10),
  leadInspector: '',
  additionalInspectors: '',
  purpose: '',
  scope: '',
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.templateId) errors.templateId = 'Select an inspection template.';
  if (!values.title.trim()) errors.title = 'Inspection title is required.';
  if (!values.workplace.trim()) errors.workplace = 'Workplace is required.';
  if (!values.area.trim()) errors.area = 'Area / department is required.';
  if (!values.inspectionDate) errors.inspectionDate = 'Select an inspection date.';
  if (!values.leadInspector.trim()) errors.leadInspector = 'Lead inspector is required.';
  return errors;
}

export function NewInspectionPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { workplaces, departments } = useWorkplaceSuggestions();
  const { user } = useAuth();
  const users = useUsers();
  const [searchParams] = useSearchParams();
  const preselectedTemplateId = searchParams.get('templateId') ?? '';

  const [templates, setTemplates] = useState<InspectionTemplate[] | null>(null);
  const [values, setValues] = useState<FormValues>({
    ...EMPTY_VALUES,
    templateId: preselectedTemplateId,
    leadInspector: user?.name ?? '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listTemplates()
      .then((all) => setTemplates(all.filter((t) => t.status === 'Active')))
      .catch(() => setTemplates([]));
  }, []);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setGeneralError(null);

    try {
      const created = await createInspection({
        templateId: values.templateId,
        title: values.title.trim(),
        organisation: values.organisation.trim(),
        workplace: values.workplace.trim(),
        area: values.area.trim(),
        specificLocation: values.specificLocation.trim(),
        inspectionDate: values.inspectionDate,
        leadInspector: values.leadInspector.trim(),
        additionalInspectors: values.additionalInspectors
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        purpose: values.purpose.trim(),
        scope: values.scope.trim(),
      });
      showToast('success', `Inspection ${created.referenceNumber} created.`);
      navigate(`/inspections/${created.id}/conduct`);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(err.details as FormErrors);
        setGeneralError(err.message);
      } else {
        setGeneralError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (templates === null) {
    return <LoadingState label="Loading inspection templates…" />;
  }

  if (templates.length === 0) {
    return (
      <>
        <PageHeader title="New Inspection" description="Start a new inspection from a template." />
        <EmptyState
          icon={ClipboardList}
          title="No active templates available"
          description="Create and activate an inspection template before starting an inspection."
          action={
            <Button variant="secondary" className="mt-2" onClick={() => navigate('/inspection-templates/new')}>
              Create a Template
            </Button>
          }
        />
      </>
    );
  }

  const selectedTemplate = templates.find((t) => t.id === values.templateId);

  return (
    <>
      <PageHeader title="New Inspection" description="Start a new inspection from a template." />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {generalError && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {generalError}
          </div>
        )}

        <SectionCard title="Template" description="Choose the checklist this inspection will follow.">
          <FormField label="Inspection Template" htmlFor="templateId" required error={errors.templateId}>
            <Select
              id="templateId"
              value={values.templateId}
              invalid={!!errors.templateId}
              onChange={(e) => setField('templateId', e.target.value)}
            >
              <option value="">Select a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code}) &middot; v{t.version}
                </option>
              ))}
            </Select>
          </FormField>
          {selectedTemplate && (
            <p className="mt-2 text-xs text-muted">
              {selectedTemplate.sections.length} sections &middot;{' '}
              {selectedTemplate.sections.reduce((sum, s) => sum + s.questions.length, 0)} questions &middot;{' '}
              {selectedTemplate.category}
            </p>
          )}
        </SectionCard>

        <SectionCard title="Inspection Details" description="Basic identification for this inspection.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Inspection Title" htmlFor="title" required error={errors.title}>
              <Input
                id="title"
                value={values.title}
                invalid={!!errors.title}
                placeholder="e.g. Monthly Head Office Safety Walkthrough"
                onChange={(e) => setField('title', e.target.value)}
              />
            </FormField>
            <FormField label="Inspection Date" htmlFor="inspectionDate" required error={errors.inspectionDate}>
              <Input
                id="inspectionDate"
                type="date"
                value={values.inspectionDate}
                invalid={!!errors.inspectionDate}
                onChange={(e) => setField('inspectionDate', e.target.value)}
              />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Location" description="Where this inspection takes place. Fields adapt to any workplace type.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Organisation" htmlFor="organisation" hint="Optional — top-level organisation or company.">
              <Input
                id="organisation"
                value={values.organisation}
                placeholder="e.g. Acme NGO"
                onChange={(e) => setField('organisation', e.target.value)}
              />
            </FormField>
            <FormField label="Workplace / Site" htmlFor="workplace" required error={errors.workplace}>
              <Input
                id="workplace"
                list="inspection-workplace-suggestions"
                value={values.workplace}
                invalid={!!errors.workplace}
                placeholder="e.g. Head Office, Main Hospital, Project Site"
                onChange={(e) => setField('workplace', e.target.value)}
              />
              <datalist id="inspection-workplace-suggestions">
                {workplaces.map((w) => (
                  <option key={w} value={w} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Area / Department / Unit" htmlFor="area" required error={errors.area}>
              <Input
                id="area"
                list="inspection-area-suggestions"
                value={values.area}
                invalid={!!errors.area}
                placeholder="e.g. Finance Department, Block B, Laboratory"
                onChange={(e) => setField('area', e.target.value)}
              />
              <datalist id="inspection-area-suggestions">
                {departments.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Specific Location" htmlFor="specificLocation" hint="Optional — e.g. Level 4, Dock 3, Sample Preparation Area.">
              <Input
                id="specificLocation"
                value={values.specificLocation}
                placeholder="e.g. Open Office, Machine Area, Dock 3"
                onChange={(e) => setField('specificLocation', e.target.value)}
              />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Inspection Team" description="Who is carrying out this inspection.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Lead Inspector" htmlFor="leadInspector" required error={errors.leadInspector}>
              <Select
                id="leadInspector"
                value={values.leadInspector}
                invalid={!!errors.leadInspector}
                onChange={(e) => setField('leadInspector', e.target.value)}
              >
                <option value="">Select lead inspector…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} &middot; {u.role}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Additional Inspectors"
              htmlFor="additionalInspectors"
              hint="Optional — separate multiple names with commas."
            >
              <Input
                id="additionalInspectors"
                value={values.additionalInspectors}
                placeholder="e.g. John Smith, Mary Wanjiku"
                onChange={(e) => setField('additionalInspectors', e.target.value)}
              />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Purpose & Scope" description="Optional context for this inspection.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Purpose" htmlFor="purpose">
              <Textarea
                id="purpose"
                rows={2}
                value={values.purpose}
                placeholder="e.g. Routine monthly safety walkthrough"
                onChange={(e) => setField('purpose', e.target.value)}
              />
            </FormField>
            <FormField label="Scope" htmlFor="scope">
              <Textarea
                id="scope"
                rows={2}
                value={values.scope}
                placeholder="e.g. Full head office floor, excluding server room"
                onChange={(e) => setField('scope', e.target.value)}
              />
            </FormField>
          </div>
        </SectionCard>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/inspections')} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Create & Start Inspection
          </Button>
        </div>
      </form>
    </>
  );
}
