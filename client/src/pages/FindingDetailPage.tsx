import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Pencil, Wrench } from 'lucide-react';
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
import { FindingDetailHeader } from '../components/findings/FindingDetailHeader';
import { FindingQuickActionsBar } from '../components/findings/FindingQuickActionsBar';
import { FindingRelatedRecordsPanel } from '../components/findings/FindingRelatedRecordsPanel';
import { FindingDetailSkeleton } from '../components/findings/FindingDetailSkeleton';
import { FindingForm, type ValidatedFindingFormData } from '../components/findings/FindingForm';
import { addFindingComment, getFinding, updateFinding } from '../lib/findingsApi';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { useAuth } from '../lib/AuthContext';
import { canCreateCorrectiveAction } from '../lib/roles';
import { FINDING_STATUSES } from '../lib/findingOptions';
import { toDateInputValue } from '../lib/format';
import type { FindingDetail, FindingStatus, UpdateFindingPayload } from '../lib/findingTypes';

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

export function FindingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const role = user!.role;

  const [finding, setFinding] = useState<FindingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const loadFinding = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    getFinding(id)
      .then((detail) => setFinding(detail))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : 'Could not load finding.');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadFinding();
  }, [loadFinding]);

  async function performStatusChange(status: FindingStatus) {
    if (!finding) return;
    try {
      const updated = await updateFinding(finding.id, { status, actor: user!.name });
      setFinding(updated);
      showToast('success', `Status updated to "${status}".`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update status.');
    }
  }

  function requestVerifyAndClose() {
    setConfirmState({
      title: 'Verify and close this finding?',
      message: 'This confirms the fix has been verified and marks the finding as closed. You can reopen it later if needed.',
      confirmLabel: 'Verify & Close',
      danger: true,
      onConfirm: () => {
        setConfirmState(null);
        void performStatusChange('Closed');
      },
    });
  }

  function requestReopen() {
    setConfirmState({
      title: 'Reopen this finding?',
      message: 'This will move the finding back to Open for further work.',
      confirmLabel: 'Reopen Finding',
      onConfirm: () => {
        setConfirmState(null);
        void performStatusChange('Open');
      },
    });
  }

  async function handleAssign(officer: string) {
    if (!finding) return;
    try {
      const updated = await updateFinding(finding.id, { assignedTo: officer, actor: user!.name });
      setFinding(updated);
      showToast('success', officer ? `Assigned to ${officer}.` : 'Finding unassigned.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update assignment.');
    }
  }

  async function handleAddComment(message: string) {
    if (!finding) return;
    await addFindingComment(finding.id, { author: user!.name, message });
    const refreshed = await getFinding(finding.id);
    setFinding(refreshed);
    showToast('success', 'Comment added.');
  }

  async function handleEditSubmit(data: ValidatedFindingFormData) {
    if (!finding) return;
    const payload: UpdateFindingPayload = {
      title: data.title,
      description: data.description,
      workplace: data.workplace,
      department: data.department,
      location: data.location,
      riskLevel: data.riskLevel,
      dueDate: data.dueDate,
      assignedTo: data.assignedTo,
      actor: user!.name,
    };
    const updated = await updateFinding(finding.id, payload);
    setFinding(updated);
    setEditing(false);
    showToast('success', 'Changes saved successfully.');
  }

  if (loading) {
    return <FindingDetailSkeleton />;
  }

  if (notFound) {
    return (
      <>
        <PageHeader title="Finding Not Found" />
        <EmptyState
          icon={AlertTriangle}
          title="No matching finding"
          description={`No finding exists for ID "${id}".`}
          action={
            <Link to="/findings">
              <Button variant="secondary" className="mt-2">
                Back to Findings
              </Button>
            </Link>
          }
        />
      </>
    );
  }

  if (error || !finding) {
    return (
      <>
        <PageHeader title="Finding" />
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load finding"
          description={error ?? 'Something went wrong.'}
          action={
            <Button variant="secondary" className="mt-2" onClick={loadFinding}>
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
        <PageHeader title={`Edit ${finding.referenceNumber}`} description="Update the details of this finding." />
        <FindingForm
          mode="edit"
          initialValues={{ ...finding, dueDate: toDateInputValue(finding.dueDate) }}
          submitLabel="Save Changes"
          onSubmit={handleEditSubmit}
          onCancel={() => setEditing(false)}
        />
      </>
    );
  }

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'comments', label: 'Comments', badge: finding.comments.length },
    { id: 'activity', label: 'Activity', badge: finding.activity.length },
    { id: 'related', label: 'Related Records' },
  ];

  return (
    <>
      <FindingDetailHeader
        finding={finding}
        actions={
          <>
            <AssignOfficerMenu assignedTo={finding.assignedTo} onAssign={handleAssign} />
            <ChangeStatusMenu current={finding.status} statuses={FINDING_STATUSES} onUpdate={performStatusChange} />
            {canCreateCorrectiveAction(role) && (
              <Button variant="secondary" onClick={() => navigate(`/corrective-actions/new?findingId=${finding.id}`)}>
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
        <FindingQuickActionsBar
          status={finding.status}
          onStartWork={() => void performStatusChange('In Progress')}
          onSubmitForVerification={() => void performStatusChange('Awaiting Verification')}
          onSendBack={() => void performStatusChange('In Progress')}
          onVerifyAndClose={requestVerifyAndClose}
          onReopen={requestReopen}
        />
      </div>

      <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

      <div className="mt-4">
        {activeTab === 'overview' && (
          <SectionCard title="Overview">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Description</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-body">{finding.description}</p>
            </div>
          </SectionCard>
        )}

        {activeTab === 'comments' && (
          <SectionCard title="Comments" description="Discussion and notes from the safety team.">
            <CommentsSection comments={finding.comments} onAdd={handleAddComment} />
          </SectionCard>
        )}

        {activeTab === 'activity' && (
          <SectionCard title="Activity" description="System-recorded history for this finding.">
            <ActivityTimeline items={finding.activity} />
          </SectionCard>
        )}

        {activeTab === 'related' && <FindingRelatedRecordsPanel finding={finding} />}
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
