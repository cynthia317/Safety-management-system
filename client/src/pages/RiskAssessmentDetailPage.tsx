import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCheck, Pencil, Send, Wrench, XCircle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { Tabs, type TabItem } from '../components/Tabs';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { RiskItemsView } from '../components/risk-assessments/RiskItemsView';
import { RiskMatrixBadge } from '../components/risk-assessments/RiskMatrixBadge';
import { RiskAssessmentRelatedRecordsPanel } from '../components/risk-assessments/RiskAssessmentRelatedRecordsPanel';
import { getRiskAssessment, updateRiskAssessment } from '../lib/riskAssessmentsApi';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { useAuth } from '../lib/AuthContext';
import { canCreateCorrectiveAction } from '../lib/roles';
import { formatDate } from '../lib/format';
import type { RiskAssessmentDetail, RiskAssessmentStatus } from '../lib/riskAssessmentTypes';

export function RiskAssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [assessment, setAssessment] = useState<RiskAssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [busy, setBusy] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    getRiskAssessment(id)
      .then((a) => setAssessment(a))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof Error ? err.message : 'Could not load risk assessment.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(status: RiskAssessmentStatus) {
    if (!assessment) return;
    setBusy(true);
    try {
      const updated = await updateRiskAssessment(assessment.id, {
        status,
        actor: user!.name,
        ...(status === 'Approved' ? { approvedBy: user!.name } : {}),
      });
      setAssessment(updated);
      showToast('success', `Risk assessment marked as ${status}.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update risk assessment.');
    } finally {
      setBusy(false);
    }
  }

  function requestClose() {
    setShowCloseConfirm(true);
  }

  if (loading) return <LoadingState label="Loading risk assessment…" />;

  if (notFound) {
    return (
      <>
        <PageHeader title="Risk Assessment Not Found" />
        <EmptyState
          icon={AlertTriangle}
          title="No matching risk assessment"
          description={`No risk assessment exists for ID "${id}".`}
          action={
            <Link to="/risk-assessments">
              <Button variant="secondary" className="mt-2">
                Back to Risk Assessments
              </Button>
            </Link>
          }
        />
      </>
    );
  }

  if (error || !assessment) {
    return (
      <>
        <PageHeader title="Risk Assessment" />
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load risk assessment"
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

  const worstScore = assessment.items.reduce((max, i) => Math.max(max, i.residualRiskScore ?? i.riskScore), 0);

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'items', label: 'Risk Items', badge: assessment.items.length },
    { id: 'activity', label: 'Activity', badge: assessment.activity.length },
    { id: 'related', label: 'Related Records' },
  ];

  const createCorrectiveActionButton = canCreateCorrectiveAction(user!.role) ? (
    <Button variant="secondary" onClick={() => navigate(`/corrective-actions/new?riskAssessmentId=${assessment.id}`)}>
      <Wrench className="h-4 w-4" />
      Create Corrective Action
    </Button>
  ) : null;

  const headerActions = (() => {
    switch (assessment.status) {
      case 'Draft':
        return (
          <>
            {createCorrectiveActionButton}
            <Link to={`/risk-assessments/${assessment.id}/edit`}>
              <Button variant="secondary">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button variant="primary" loading={busy} onClick={() => void handleStatusChange('Under Review')}>
              <Send className="h-4 w-4" />
              Submit for Review
            </Button>
          </>
        );
      case 'Under Review':
        return (
          <>
            {createCorrectiveActionButton}
            <Link to={`/risk-assessments/${assessment.id}/edit`}>
              <Button variant="secondary">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button variant="primary" loading={busy} onClick={() => void handleStatusChange('Approved')}>
              <CheckCheck className="h-4 w-4" />
              Approve
            </Button>
          </>
        );
      case 'Approved':
        return (
          <>
            {createCorrectiveActionButton}
            <Link to={`/risk-assessments/${assessment.id}/edit`}>
              <Button variant="secondary">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button variant="primary" loading={busy} onClick={requestClose}>
              <XCircle className="h-4 w-4" />
              Close
            </Button>
          </>
        );
      default:
        return createCorrectiveActionButton;
    }
  })();

  return (
    <>
      <PageHeader
        title={assessment.title}
        description={`${assessment.referenceNumber} · ${assessment.workplace} / ${assessment.department}`}
        action={<div className="flex flex-wrap gap-2">{headerActions}</div>}
      />

      <div className="mt-4">
        <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
      </div>

      <div className="mt-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <SectionCard title="Description / Scope">
                <p className="text-sm text-body">{assessment.description || 'Not specified.'}</p>
              </SectionCard>

              <SectionCard title="Location">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Workplace</dt>
                    <dd className="mt-0.5 text-sm text-body">{assessment.workplace}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Area / Department</dt>
                    <dd className="mt-0.5 text-sm text-body">{assessment.department}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Specific Location</dt>
                    <dd className="mt-0.5 text-sm text-body">{assessment.location || 'Not specified'}</dd>
                  </div>
                </dl>
              </SectionCard>
            </div>

            <div className="space-y-4">
              <SectionCard title="Status">
                <StatusBadge status={assessment.status} />
              </SectionCard>

              <SectionCard title="Overall Risk" description="Highest residual (or initial) score across all items.">
                <RiskMatrixBadge score={worstScore} level={assessment.overallRiskLevel} />
              </SectionCard>

              <SectionCard title="Assessment">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Type</dt>
                    <dd className="text-right font-medium text-body">{assessment.assessmentType}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Assessed by</dt>
                    <dd className="text-right font-medium text-body">{assessment.assessedBy}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Approved by</dt>
                    <dd className="text-right font-medium text-body">{assessment.approvedBy || 'Not yet approved'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Assessment date</dt>
                    <dd className="text-right font-medium text-body">{formatDate(assessment.assessmentDate)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Next review</dt>
                    <dd className="text-right font-medium text-body">
                      {assessment.nextReviewDate ? formatDate(assessment.nextReviewDate) : 'Not set'}
                    </dd>
                  </div>
                </dl>
              </SectionCard>
            </div>
          </div>
        )}

        {activeTab === 'items' && (
          <SectionCard title="Risk Items" description="Hazards scored using the likelihood x severity matrix.">
            <RiskItemsView items={assessment.items} />
          </SectionCard>
        )}

        {activeTab === 'activity' && (
          <SectionCard title="Activity" description="System-recorded history for this risk assessment.">
            <ActivityTimeline items={assessment.activity} />
          </SectionCard>
        )}

        {activeTab === 'related' && <RiskAssessmentRelatedRecordsPanel assessment={assessment} />}
      </div>

      {showCloseConfirm && (
        <ConfirmDialog
          title="Close this risk assessment?"
          message="Closing marks this assessment as no longer active — use this when it's superseded by a new assessment. This cannot be undone from here."
          confirmLabel="Close Risk Assessment"
          danger
          onConfirm={() => {
            setShowCloseConfirm(false);
            void handleStatusChange('Closed');
          }}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}
    </>
  );
}
