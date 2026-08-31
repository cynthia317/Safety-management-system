import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { Button } from '../Button';
import { FormField } from '../form/FormField';
import { Textarea } from '../form/Textarea';
import { RiskBadge } from '../RiskBadge';
import { WizardProgress, type WizardStep } from './WizardProgress';
import { ReportDetailsFields } from './fields/ReportDetailsFields';
import { LocationFields } from './fields/LocationFields';
import { RiskFields } from './fields/RiskFields';
import { AssignmentFields } from './fields/AssignmentFields';
import { EvidenceUpload, type PendingEvidence } from './EvidenceUpload';
import { createHazard } from '../../lib/hazardsApi';
import { addIncidentComment } from '../../lib/incidentsApi';
import { ApiError } from '../../lib/api';
import { useToast } from '../../lib/ToastContext';
import { useAuth } from '../../lib/AuthContext';
import {
  EMPTY_HAZARD_FORM_VALUES,
  STEP_FIELDS,
  validateHazardForm,
  type HazardFormErrors,
} from '../../lib/hazardValidation';
import type { HazardCategory, HazardFormValues, HazardReport, ReportType, RiskLevel } from '../../lib/hazardTypes';

export interface HazardWizardSourceIncident {
  id: string;
  referenceNumber: string;
}

interface HazardWizardProps {
  /** Pre-fills fields carried over from a source record (e.g. an Incident) — never
   * copies free-text fields wholesale, just enough context to save re-typing. */
  initialValues?: Partial<HazardFormValues>;
  /** When set, a best-effort activity comment is posted back onto this Incident after
   * the Hazard is created — mirrors the Finding/Hazard -> Corrective Action cross-link
   * pattern in NewCorrectiveActionPage.tsx. */
  sourceIncident?: HazardWizardSourceIncident;
}

const STEPS: WizardStep[] = [
  { id: 'details', label: 'Report Details' },
  { id: 'location', label: 'Location' },
  { id: 'risk', label: 'Risk & Evidence' },
  { id: 'review', label: 'Review' },
];

const STEP_DESCRIPTIONS: Record<string, string> = {
  details: 'What happened, and what kind of report this is.',
  location: 'Where the hazard was observed.',
  risk: 'Severity, who could be affected, evidence, and ownership.',
  review: 'Check everything before submitting.',
};

function ReviewSection({
  title,
  stepIndex,
  onEdit,
  children,
}: {
  title: string;
  stepIndex: number;
  onEdit: (index: number) => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-border pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(stepIndex)}
          className="rounded text-xs font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          Edit
        </button>
      </div>
      <div className="mt-2 space-y-1 text-sm text-body">{children}</div>
    </div>
  );
}

export function HazardWizard({ initialValues, sourceIncident }: HazardWizardProps = {}) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [values, setValues] = useState<HazardFormValues>({
    ...EMPTY_HAZARD_FORM_VALUES,
    reportedBy: user?.name ?? '',
    ...initialValues,
  });
  const [errors, setErrors] = useState<HazardFormErrors>({});
  const [evidenceFiles, setEvidenceFiles] = useState<PendingEvidence[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdHazard, setCreatedHazard] = useState<HazardReport | null>(null);

  const stepId = STEPS[currentStepIndex]?.id ?? 'details';

  function setField<K extends keyof HazardFormValues>(key: K, value: HazardFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleContinue() {
    if (stepId === 'review') return;

    const fieldGroup = STEP_FIELDS[stepId as keyof typeof STEP_FIELDS];
    const allErrors = validateHazardForm(values);
    const relevantErrors: HazardFormErrors = {};
    for (const field of fieldGroup) {
      if (allErrors[field]) relevantErrors[field] = allErrors[field];
    }

    if (Object.keys(relevantErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...relevantErrors }));
      return;
    }

    setCurrentStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function handleBack() {
    if (currentStepIndex === 0) {
      navigate('/hazards');
      return;
    }
    setCurrentStepIndex((i) => i - 1);
  }

  function jumpToStep(index: number) {
    setCurrentStepIndex(index);
  }

  async function handleSubmit() {
    const allErrors = validateHazardForm(values);

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstInvalidStep = STEPS.findIndex((step) => {
        const fields = STEP_FIELDS[step.id as keyof typeof STEP_FIELDS];
        return fields?.some((field) => allErrors[field]);
      });
      if (firstInvalidStep >= 0) setCurrentStepIndex(firstInvalidStep);
      return;
    }

    setSubmitting(true);
    setGeneralError(null);

    try {
      const created = await createHazard({
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
        evidence: evidenceFiles.map((f) => ({
          fileName: f.fileName,
          fileSize: f.fileSize,
          mimeType: f.mimeType,
          dataUrl: f.dataUrl,
        })),
      });
      setCreatedHazard(created);
      showToast('success', `Hazard ${created.referenceNumber} has been reported.`);

      if (sourceIncident) {
        try {
          await addIncidentComment(sourceIncident.id, {
            author: values.reportedBy.trim(),
            message: `Created hazard report ${created.referenceNumber}: ${created.title}`,
          });
        } catch {
          // Best-effort cross-link note — don't block the hazard report if this fails.
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(err.details as HazardFormErrors);
        setGeneralError(err.message);
      } else {
        setGeneralError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
      showToast('error', 'Could not submit the hazard report.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReportAnother() {
    setValues({ ...EMPTY_HAZARD_FORM_VALUES, reportedBy: user?.name ?? '' });
    setErrors({});
    setEvidenceFiles([]);
    setGeneralError(null);
    setCurrentStepIndex(0);
    setCreatedHazard(null);
  }

  if (createdHazard) {
    return (
      <div className="rounded-md border border-emerald-500/30 bg-surface p-6 text-center sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h2 className="mt-3 text-lg font-semibold text-heading">
          Hazard {createdHazard.referenceNumber} has been reported successfully.
        </h2>
        <p className="mt-1 text-sm text-muted">
          Safety officers have been notified and can now review this report.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button variant="primary" onClick={() => navigate(`/hazards/${createdHazard.id}`)}>
            View Hazard
          </Button>
          <Button variant="secondary" onClick={handleReportAnother}>
            Report Another Hazard
          </Button>
          <Button variant="ghost" onClick={() => navigate('/hazards')}>
            Return to Hazard Reports
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <WizardProgress steps={STEPS} currentIndex={currentStepIndex} />

      {generalError && (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {generalError}
        </div>
      )}

      <SectionCard title={STEPS[currentStepIndex]?.label ?? ''} description={STEP_DESCRIPTIONS[stepId]}>
        {stepId === 'details' && (
          <ReportDetailsFields values={values} errors={errors} onFieldChange={setField} />
        )}

        {stepId === 'location' && (
          <LocationFields values={values} errors={errors} onFieldChange={setField} />
        )}

        {stepId === 'risk' && (
          <div className="space-y-5">
            <RiskFields values={values} errors={errors} onFieldChange={setField} />

            <div className="border-t border-border pt-4">
              <FormField
                label="Immediate Action Taken"
                htmlFor="immediateActionTaken"
                hint="Optional — leave blank if no action has been taken yet."
              >
                <Textarea
                  id="immediateActionTaken"
                  rows={3}
                  value={values.immediateActionTaken}
                  placeholder="e.g. Area cordoned off and warning signage placed."
                  onChange={(e) => setField('immediateActionTaken', e.target.value)}
                />
              </FormField>
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                Evidence <span className="normal-case text-muted">(optional)</span>
              </p>
              <EvidenceUpload files={evidenceFiles} onChange={setEvidenceFiles} />
            </div>

            <div className="border-t border-border pt-4">
              <AssignmentFields values={values} errors={errors} onFieldChange={setField} />
            </div>
          </div>
        )}

        {stepId === 'review' && (
          <div className="space-y-4">
            <ReviewSection title="Report Details" stepIndex={0} onEdit={jumpToStep}>
              <p>
                <span className="text-muted">Type:</span> {values.reportType}
              </p>
              <p className="font-medium text-heading">{values.title}</p>
              <p className="whitespace-pre-wrap text-muted">{values.description}</p>
            </ReviewSection>

            <ReviewSection title="Location" stepIndex={1} onEdit={jumpToStep}>
              <p>
                {values.workplace} / {values.department}
              </p>
              <p className="text-muted">{values.location}</p>
            </ReviewSection>

            <ReviewSection title="Risk & Evidence" stepIndex={2} onEdit={jumpToStep}>
              <div className="flex flex-wrap items-center gap-2">
                <span>{values.hazardCategory}</span>
                {values.riskLevel && <RiskBadge level={values.riskLevel} />}
              </div>
              <p className="text-muted">{values.peopleAtRisk}</p>
              {values.immediateActionTaken && (
                <p className="text-muted">Action taken: {values.immediateActionTaken}</p>
              )}
              <p className="text-muted">
                {evidenceFiles.length > 0
                  ? `${evidenceFiles.length} photo${evidenceFiles.length === 1 ? '' : 's'} attached`
                  : 'No photos attached'}
              </p>
              <p>
                <span className="text-muted">Reported by:</span> {values.reportedBy}
              </p>
              <p>
                <span className="text-muted">Assigned to:</span> {values.assignedTo || 'Unassigned'}
              </p>
            </ReviewSection>
          </div>
        )}
      </SectionCard>

      <div className="mt-6 hidden items-center justify-between gap-2 sm:flex">
        <Button type="button" variant="secondary" onClick={handleBack} disabled={submitting}>
          {currentStepIndex === 0 ? 'Cancel' : 'Back'}
        </Button>
        {stepId === 'review' ? (
          <Button type="button" variant="primary" loading={submitting} onClick={handleSubmit}>
            Submit Report
          </Button>
        ) : (
          <Button type="button" variant="primary" onClick={handleContinue}>
            Continue
          </Button>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2 border-t border-border bg-canvas-raised p-3 sm:hidden">
        <Button type="button" variant="secondary" className="flex-1" onClick={handleBack} disabled={submitting}>
          {currentStepIndex === 0 ? 'Cancel' : 'Back'}
        </Button>
        {stepId === 'review' ? (
          <Button type="button" variant="primary" className="flex-1" loading={submitting} onClick={handleSubmit}>
            Submit
          </Button>
        ) : (
          <Button type="button" variant="primary" className="flex-1" onClick={handleContinue}>
            Continue
          </Button>
        )}
      </div>
      <div className="h-16 sm:hidden" aria-hidden="true" />
    </div>
  );
}
