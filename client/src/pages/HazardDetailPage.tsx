import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, FileSearch, Pencil, ShieldAlert, Wrench } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Tabs, type TabItem } from '../components/Tabs';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { CommentsSection } from '../components/CommentsSection';
import { AssignOfficerMenu } from '../components/AssignOfficerMenu';
import { ChangeStatusMenu } from '../components/ChangeStatusMenu';
import { EvidenceGallery } from '../components/hazards/EvidenceGallery';
import { RelatedRecordsPanel } from '../components/hazards/RelatedRecordsPanel';
import { HazardDetailHeader } from '../components/hazards/HazardDetailHeader';
import { HazardQuickActionsBar } from '../components/hazards/HazardQuickActionsBar';
import { HazardDetailSkeleton } from '../components/hazards/HazardDetailSkeleton';
import { HazardForm, type ValidatedHazardFormData } from '../components/hazards/HazardForm';
import { addHazardComment, getHazard, updateHazard } from '../lib/hazardsApi';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { useAuth } from '../lib/AuthContext';
import { canCreateCorrectiveAction, canManageRiskAssessments } from '../lib/roles';
import { HAZARD_STATUSES } from '../lib/hazardOptions';
import type { HazardDetail, HazardStatus, UpdateHazardPayload } from '../lib/hazardTypes';

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

export function HazardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const role = user!.role;

  const [hazard, setHazard] = useState<HazardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const loadHazard = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    getHazard(id)
      .then((detail) => setHazard(detail))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : 'Could not load hazard report.');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadHazard();
  }, [loadHazard]);

  async function performStatusChange(status: HazardStatus) {
    if (!hazard) return;
    try {
      const updated = await updateHazard(hazard.id, { status, actor: user!.name });
      setHazard(updated);
      showToast('success', `Status updated to "${status}".`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update status.');
    }
  }

  function requestClose() {
    setConfirmState({
      title: 'Close this hazard report?',
      message: 'Closing marks this report as fully resolved. You can reopen it later if needed.',
      confirmLabel: 'Close Report',
      danger: true,
      onConfirm: () => {
        setConfirmState(null);
        void performStatusChange('Closed');
      },
    });
  }

  function requestReopen() {
    setConfirmState({
      title: 'Reopen this hazard report?',
      message: 'This will move the report back to Under Review for further action.',
      confirmLabel: 'Reopen Report',
      onConfirm: () => {
        setConfirmState(null);
        void performStatusChange('Under Review');
      },
    });
  }

  async function handleAssign(officer: string) {
    if (!hazard) return;
    try {
      const updated = await updateHazard(hazard.id, { assignedTo: officer, actor: user!.name });
      setHazard(updated);
      showToast('success', officer ? `Assigned to ${officer}.` : 'Report unassigned.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update assignment.');
    }
  }

  async function handleVerify() {
    if (!hazard) return;
    try {
      await addHazardComment(hazard.id, { author: user!.name, message: 'Verified as resolved.' });
      const refreshed = await getHazard(hazard.id);
      setHazard(refreshed);
      showToast('success', 'Marked as verified.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not record verification.');
    }
  }

  function handleAddUpdate() {
    setActiveTab('comments');
    window.setTimeout(() => {
      document.getElementById('comment-message')?.focus();
    }, 50);
  }

  async function handleAddComment(message: string) {
    if (!hazard) return;
    await addHazardComment(hazard.id, { author: user!.name, message });
    const refreshed = await getHazard(hazard.id);
    setHazard(refreshed);
    showToast('success', 'Comment added.');
  }

  async function handleEditSubmit(data: ValidatedHazardFormData) {
    if (!hazard) return;
    const payload: UpdateHazardPayload = {
      title: data.title,
      description: data.description,
      reportType: data.reportType,
      hazardCategory: data.hazardCategory,
      workplace: data.workplace,
      department: data.department,
      location: data.location,
      peopleAtRisk: data.peopleAtRisk,
      immediateActionTaken: data.immediateActionTaken,
      riskLevel: data.riskLevel,
      assignedTo: data.assignedTo,
      actor: user!.name,
    };
    const updated = await updateHazard(hazard.id, payload);
    setHazard(updated);
    setEditing(false);
    showToast('success', 'Changes saved successfully.');
  }

  if (loading) {
    return <HazardDetailSkeleton />;
  }

  if (notFound) {
    return (
      <>
        <PageHeader title="Hazard Report Not Found" />
        <EmptyState
          icon={AlertTriangle}
          title="No matching hazard report"
          description={`No hazard report exists for ID "${id}".`}
          action={
            <Link to="/hazards">
              <Button variant="secondary" className="mt-2">
                Back to Hazard Reports
              </Button>
            </Link>
          }
        />
      </>
    );
  }

  if (error || !hazard) {
    return (
      <>
        <PageHeader title="Hazard Report" />
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load hazard report"
          description={error ?? 'Something went wrong.'}
          action={
            <Button variant="secondary" className="mt-2" onClick={loadHazard}>
              Retry
            </Button>
          }
        />
      </>
    );
  }

  if (editing) {
    return (
      <>
        <PageHeader
          title={`Edit ${hazard.referenceNumber}`}
          description="Update the details of this hazard report."
        />
        <HazardForm
          mode="edit"
          initialValues={hazard}
          submitLabel="Save Changes"
          onSubmit={handleEditSubmit}
          onCancel={() => setEditing(false)}
        />
      </>
    );
  }

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'evidence', label: 'Evidence', badge: hazard.evidence.length },
    { id: 'comments', label: 'Comments', badge: hazard.comments.length },
    { id: 'activity', label: 'Activity', badge: hazard.activity.length },
    { id: 'related', label: 'Related Records' },
  ];

  return (
    <>
      <HazardDetailHeader
        hazard={hazard}
        actions={
          <>
            <AssignOfficerMenu assignedTo={hazard.assignedTo} onAssign={handleAssign} />
            <ChangeStatusMenu current={hazard.status} statuses={HAZARD_STATUSES} onUpdate={performStatusChange} />
            <Button variant="secondary" onClick={() => navigate(`/findings/new?hazardId=${hazard.id}`)}>
              <FileSearch className="h-4 w-4" />
              Create Finding
            </Button>
            {canManageRiskAssessments(role) && (
              <Button variant="secondary" onClick={() => navigate(`/risk-assessments/new?hazardId=${hazard.id}`)}>
                <ShieldAlert className="h-4 w-4" />
                Create Risk Assessment
              </Button>
            )}
            {canCreateCorrectiveAction(role) && (
              <Button variant="secondary" onClick={() => navigate(`/corrective-actions/new?hazardId=${hazard.id}`)}>
                <Wrench className="h-4 w-4" />
                Create Corrective Action
              </Button>
            )}
            <Button variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </>
        }
      />

      <div className="mt-4">
        <HazardQuickActionsBar
          status={hazard.status}
          onBeginReview={() => void performStatusChange('Under Review')}
          onRequireAction={() => void performStatusChange('Action Required')}
          onResolve={() => void performStatusChange('Resolved')}
          onViewCorrectiveAction={() => setActiveTab('related')}
          onAddUpdate={handleAddUpdate}
          onVerify={() => void handleVerify()}
          onClose={requestClose}
          onReopen={requestReopen}
        />
      </div>

      <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

      <div className="mt-4">
        {activeTab === 'overview' && (
          <SectionCard title="Overview">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Description</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-body">{hazard.description}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Immediate Action Taken
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-body">
                  {hazard.immediateActionTaken || 'No immediate action recorded.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Report Type</p>
                  <p className="mt-0.5 text-sm text-body">{hazard.reportType}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Hazard Category</p>
                  <p className="mt-0.5 text-sm text-body">{hazard.hazardCategory}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">People Exposed</p>
                  <p className="mt-0.5 text-sm text-body">{hazard.peopleAtRisk}</p>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {activeTab === 'evidence' && (
          <SectionCard title="Evidence" description="Photos and files attached to this report.">
            <EvidenceGallery evidence={hazard.evidence} />
          </SectionCard>
        )}

        {activeTab === 'comments' && (
          <SectionCard title="Comments" description="Discussion and notes from the safety team.">
            <CommentsSection comments={hazard.comments} onAdd={handleAddComment} />
          </SectionCard>
        )}

        {activeTab === 'activity' && (
          <SectionCard title="Activity" description="System-recorded history for this report.">
            <ActivityTimeline items={hazard.activity} />
          </SectionCard>
        )}

        {activeTab === 'related' && <RelatedRecordsPanel hazardId={hazard.id} />}
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
