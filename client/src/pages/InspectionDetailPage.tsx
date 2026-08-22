import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCheck, PlayCircle, XCircle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Tabs, type TabItem } from '../components/Tabs';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { InspectionDetailHeader } from '../components/inspections/InspectionDetailHeader';
import { InspectionChecklistView } from '../components/inspections/InspectionChecklistView';
import { PotentialFindingsPanel } from '../components/inspections/PotentialFindingsPanel';
import { InspectionEvidenceGallery } from '../components/inspections/InspectionEvidenceGallery';
import { InspectionCorrectiveActionsPanel } from '../components/inspections/InspectionCorrectiveActionsPanel';
import { InspectionDetailSkeleton } from '../components/inspections/InspectionDetailSkeleton';
import { getInspection, saveResponses, updateInspection } from '../lib/inspectionsApi';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { useAuth } from '../lib/AuthContext';
import { computeComplianceSummary, computeOverallProgress, getPotentialFindings } from '../lib/inspectionProgress';
import { formatDate } from '../lib/format';
import type { InspectionDetail, ResponseInput } from '../lib/inspectionTypes';

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

export function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

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

  useEffect(() => {
    if (window.location.hash === '#findings') setActiveTab('findings');
  }, []);

  async function handleStatusChange(status: 'Reviewed' | 'Closed') {
    if (!inspection) return;
    try {
      const updated = await updateInspection(inspection.id, { status, actor: user!.name });
      setInspection(updated);
      showToast('success', `Inspection marked as ${status}.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update inspection.');
    }
  }

  function requestClose() {
    setConfirmState({
      title: 'Close this inspection?',
      message: 'Closing marks this inspection as fully complete. This cannot be undone from here.',
      confirmLabel: 'Close Inspection',
      danger: true,
      onConfirm: () => {
        setConfirmState(null);
        void handleStatusChange('Closed');
      },
    });
  }

  async function handleCreateFinding(questionId: string) {
    if (!inspection) return;
    navigate(`/findings/new?inspectionId=${inspection.id}&questionId=${questionId}`);
  }

  async function handleCreateCorrectiveAction(questionId: string) {
    if (!inspection) return;
    navigate(`/corrective-actions/new?inspectionId=${inspection.id}&questionId=${questionId}`);
  }

  async function handleDismiss(questionId: string) {
    if (!inspection) return;
    const response = inspection.responses.find((r) => r.questionId === questionId);
    if (!response || !response.potentialFinding) return;

    const input: ResponseInput = {
      questionId: response.questionId,
      sectionId: response.sectionId,
      responseType: response.responseType,
      value: response.value,
      notes: response.notes,
      evidenceNote: response.evidenceNote,
      potentialFinding: { ...response.potentialFinding, status: 'Dismissed' },
    };

    try {
      const updated = await saveResponses(inspection.id, [input], user!.name);
      setInspection(updated);
      showToast('success', 'Potential finding dismissed.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not dismiss potential finding.');
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
        <PageHeader title="Inspection" />
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

  const progress = computeOverallProgress(inspection);
  const compliance = computeComplianceSummary(inspection);
  const potentialFindingsCount = getPotentialFindings(inspection).filter((f) => f.finding.status === 'Potential').length;
  const evidenceCount = inspection.responses.filter((r) => r.evidenceNote.trim().length > 0).length;

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'findings', label: 'Potential Findings', badge: potentialFindingsCount },
    { id: 'evidence', label: 'Evidence', badge: evidenceCount },
    { id: 'activity', label: 'Activity', badge: inspection.activity.length },
  ];

  const headerActions = (() => {
    switch (inspection.status) {
      case 'Draft':
      case 'In Progress':
        return (
          <Link to={`/inspections/${inspection.id}/conduct`}>
            <Button variant="primary">
              <PlayCircle className="h-4 w-4" />
              Continue Inspection
            </Button>
          </Link>
        );
      case 'Submitted':
        return (
          <Button variant="primary" onClick={() => void handleStatusChange('Reviewed')}>
            <CheckCheck className="h-4 w-4" />
            Mark as Reviewed
          </Button>
        );
      case 'Reviewed':
        return (
          <Button variant="primary" onClick={requestClose}>
            <XCircle className="h-4 w-4" />
            Close Inspection
          </Button>
        );
      default:
        return null;
    }
  })();

  return (
    <>
      <InspectionDetailHeader inspection={inspection} actions={headerActions} />

      <div className="mt-4">
        <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
      </div>

      <div className="mt-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <SectionCard title="Purpose & Scope">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">Purpose</p>
                    <p className="mt-1 text-sm text-body">{inspection.purpose || 'Not specified.'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">Scope</p>
                    <p className="mt-1 text-sm text-body">{inspection.scope || 'Not specified.'}</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Inspection Team">
                <p className="text-sm text-body">
                  <span className="text-muted">Lead:</span> {inspection.leadInspector}
                </p>
                {inspection.additionalInspectors.length > 0 && (
                  <p className="mt-1 text-sm text-body">
                    <span className="text-muted">Also:</span> {inspection.additionalInspectors.join(', ')}
                  </p>
                )}
              </SectionCard>

              <InspectionCorrectiveActionsPanel inspectionId={inspection.id} />
            </div>

            <div className="space-y-4">
              <SectionCard title="Completion Summary">
                <p className="text-2xl font-semibold text-heading">{progress.percent}%</p>
                <p className="text-xs text-muted">
                  {progress.answered} / {progress.total} required questions answered
                </p>
              </SectionCard>

              <SectionCard title="Compliance Summary">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Compliant</dt>
                    <dd className="font-medium text-emerald-400">{compliance.compliant}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Non-Compliant</dt>
                    <dd className="font-medium text-red-400">{compliance.nonCompliant}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Observations</dt>
                    <dd className="font-medium text-amber-400">{compliance.observation}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Not Applicable</dt>
                    <dd className="font-medium text-body">{compliance.notApplicable}</dd>
                  </div>
                </dl>
              </SectionCard>

              <SectionCard title="Submitted">
                <p className="text-sm text-body">
                  {inspection.submittedAt ? formatDate(inspection.submittedAt) : 'Not yet submitted'}
                </p>
              </SectionCard>
            </div>
          </div>
        )}

        {activeTab === 'checklist' && (
          <SectionCard title="Checklist" description="Every section and question in this inspection.">
            <InspectionChecklistView inspection={inspection} />
          </SectionCard>
        )}

        {activeTab === 'findings' && (
          <SectionCard title="Potential Findings" description="Non-compliant responses flagged during the inspection.">
            <PotentialFindingsPanel
              inspection={inspection}
              onCreateFinding={(qId) => void handleCreateFinding(qId)}
              onCreateCorrectiveAction={(qId) => void handleCreateCorrectiveAction(qId)}
              onDismiss={(qId) => void handleDismiss(qId)}
            />
          </SectionCard>
        )}

        {activeTab === 'evidence' && (
          <SectionCard title="Evidence" description="Evidence recorded against inspection questions.">
            <InspectionEvidenceGallery inspection={inspection} />
          </SectionCard>
        )}

        {activeTab === 'activity' && (
          <SectionCard title="Activity" description="System-recorded history for this inspection.">
            <ActivityTimeline items={inspection.activity} />
          </SectionCard>
        )}
      </div>

      {confirmState && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          danger={confirmState.danger}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </>
  );
}
