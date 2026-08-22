import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Eye,
  FileQuestion,
  ListChecks,
  MinusCircle,
  Percent,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { InspectionDetailSkeleton } from '../components/inspections/InspectionDetailSkeleton';
import { getInspection, submitInspection } from '../lib/inspectionsApi';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { formatDate } from '../lib/format';
import {
  computeComplianceSummary,
  computeOverallProgress,
  computeRiskSummary,
  getMissingRequiredQuestions,
  getPotentialFindings,
} from '../lib/inspectionProgress';
import type { InspectionDetail } from '../lib/inspectionTypes';
import type { RiskLevel } from '../lib/hazardTypes';

const RISK_TILE_STYLES: Record<RiskLevel, string> = {
  Critical: 'border-red-500/40 bg-red-500/10 text-red-400',
  High: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
  Medium: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  Low: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
};

export function InspectionReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    getInspection(id)
      .then((detail) => setInspection(detail))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof Error ? err.message : 'Could not load inspection.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit() {
    if (!inspection) return;
    setSubmitting(true);
    try {
      const updated = await submitInspection(inspection.id, inspection.leadInspector);
      setInspection(updated);
      setSubmitted(true);
      setShowSubmitConfirm(false);
      showToast('success', `Inspection ${updated.referenceNumber} submitted successfully.`);
    } catch (err) {
      setShowSubmitConfirm(false);
      showToast('error', err instanceof Error ? err.message : 'Could not submit inspection.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <InspectionDetailSkeleton />;

  if (notFound) {
    return (
      <>
        <PageHeader title="Inspection Not Found" />
        <EmptyState
          icon={AlertTriangle}
          title="No matching inspection"
          description={`No inspection exists for ID "${id}".`}
          action={
            <Link to="/inspections">
              <Button variant="secondary" className="mt-2">
                Back to Inspections
              </Button>
            </Link>
          }
        />
      </>
    );
  }

  if (error || !inspection) {
    return (
      <>
        <PageHeader title="Review Inspection" />
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load inspection"
          description={error ?? 'Something went wrong.'}
          action={
            <Button variant="secondary" className="mt-2" onClick={load}>
              Retry
            </Button>
          }
        />
      </>
    );
  }

  const isEditable = inspection.status === 'Draft' || inspection.status === 'In Progress';

  if (submitted || !isEditable) {
    if (submitted) {
      return (
        <div className="rounded-md border border-emerald-500/30 bg-surface p-6 text-center sm:p-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h2 className="mt-3 text-lg font-semibold text-heading">
            Inspection {inspection.referenceNumber} submitted successfully.
          </h2>
          <p className="mt-1 text-sm text-muted">
            The inspection is now locked for normal editing. Potential findings can be reviewed and formally created.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button variant="primary" onClick={() => navigate(`/inspections/${inspection.id}`)}>
              View Inspection
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/inspections/${inspection.id}#findings`)}>
              Review Potential Findings
            </Button>
            <Button variant="ghost" onClick={() => navigate('/inspections')}>
              Return to Inspections
            </Button>
          </div>
        </div>
      );
    }

    return (
      <>
        <PageHeader title={inspection.title} description={inspection.referenceNumber} />
        <EmptyState
          icon={AlertTriangle}
          title="This inspection has already been submitted"
          description="Review is only available before submission. View the inspection to see its findings and activity."
          action={
            <Link to={`/inspections/${inspection.id}`}>
              <Button variant="secondary" className="mt-2">
                View Inspection
              </Button>
            </Link>
          }
        />
      </>
    );
  }

  const overallProgress = computeOverallProgress(inspection);
  const compliance = computeComplianceSummary(inspection);
  const riskSummary = computeRiskSummary(inspection);
  const potentialFindings = getPotentialFindings(inspection).filter((f) => f.finding.status === 'Potential');
  const missing = getMissingRequiredQuestions(inspection);
  const canSubmit = missing.length === 0;

  return (
    <>
      <PageHeader
        title="Review Inspection"
        description={`${inspection.referenceNumber} — check everything before submitting.`}
      />

      <SectionCard title="Inspection Information">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['Reference', inspection.referenceNumber],
            ['Workplace', inspection.workplace],
            ['Area', inspection.area],
            ['Inspector', inspection.leadInspector],
            ['Date', formatDate(inspection.inspectionDate)],
            ['Template', `${inspection.templateName} v${inspection.templateVersion}`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</dt>
              <dd className="mt-0.5 truncate text-sm text-body">{value}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Questions" value={compliance.total} icon={ListChecks} />
        <StatCard label="Compliant" value={compliance.compliant} icon={CheckCircle2} tone="success" />
        <StatCard label="Non-Compliant" value={compliance.nonCompliant} icon={XCircle} tone="danger" />
        <StatCard label="Observations" value={compliance.observation} icon={CircleDot} tone="warning" />
        <StatCard label="Not Applicable" value={compliance.notApplicable} icon={MinusCircle} />
        <StatCard label="Completion" value={`${overallProgress.percent}%`} icon={Percent} tone="accent" />
      </div>

      <SectionCard title="Risk Summary" description="Potential findings by risk level." className="mt-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['Critical', 'High', 'Medium', 'Low'] as RiskLevel[]).map((level) => (
            <div key={level} className={`rounded-md border p-3 text-center ${RISK_TILE_STYLES[level]}`}>
              <p className="text-2xl font-semibold">{riskSummary[level]}</p>
              <p className="text-xs font-medium uppercase tracking-wide">{level}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Potential Findings"
        description={`${potentialFindings.length} item${potentialFindings.length === 1 ? '' : 's'} flagged from non-compliant responses.`}
        className="mt-4"
      >
        {potentialFindings.length === 0 ? (
          <EmptyState icon={FileQuestion} title="No potential findings" description="No non-compliant responses have been flagged as findings." />
        ) : (
          <ul className="space-y-3">
            {potentialFindings.map(({ finding, sectionTitle }) => (
              <li key={finding.id} className={`rounded-md border p-3.5 ${RISK_TILE_STYLES[finding.riskLevel]}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide">Potential Finding</span>
                  <span className="text-xs font-semibold uppercase tracking-wide">Risk: {finding.riskLevel}</span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-heading">{finding.title}</p>
                <p className="text-xs text-muted">{sectionTitle}</p>
                {finding.recommendation && (
                  <p className="mt-2 text-sm text-body">
                    <span className="font-medium text-heading">Recommendation:</span> {finding.recommendation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Submission" className="mt-4">
        {!canSubmit && (
          <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3.5">
            <p className="text-sm font-medium text-amber-400">
              {missing.length} required question{missing.length === 1 ? '' : 's'} still need
              {missing.length === 1 ? 's' : ''} a response before this inspection can be submitted.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-body">
              {missing.slice(0, 8).map((m) => (
                <li key={m.questionId}>
                  <span className="text-muted">{m.sectionTitle}:</span> {m.text}
                </li>
              ))}
              {missing.length > 8 && <li className="text-muted">…and {missing.length - 8} more.</li>}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Once submitted, the inspection will be locked for normal editing. Potential findings can then be
            reviewed and formally created.
          </p>
          <div className="flex gap-2">
            <Link to={`/inspections/${inspection.id}/conduct`}>
              <Button variant="secondary">
                <Eye className="h-4 w-4" />
                Back to Checklist
              </Button>
            </Link>
            <Button variant="primary" disabled={!canSubmit} onClick={() => setShowSubmitConfirm(true)}>
              Submit Inspection
            </Button>
          </div>
        </div>
      </SectionCard>

      {showSubmitConfirm && (
        <ConfirmDialog
          title="Submit Inspection?"
          message="Once submitted, the inspection will be locked for normal editing. Potential findings can then be reviewed and formally created."
          confirmLabel="Submit Inspection"
          onConfirm={handleSubmit}
          onCancel={() => setShowSubmitConfirm(false)}
        />
      )}

      {submitting && <div className="sr-only" aria-live="polite">Submitting inspection…</div>}
    </>
  );
}
