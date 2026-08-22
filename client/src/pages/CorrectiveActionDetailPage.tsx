import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Pencil } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Tabs, type TabItem } from '../components/Tabs';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { CommentsSection } from '../components/CommentsSection';
import { CorrectiveActionDetailHeader } from '../components/corrective-actions/CorrectiveActionDetailHeader';
import { CorrectiveActionQuickActionsBar } from '../components/corrective-actions/CorrectiveActionQuickActionsBar';
import { CorrectiveActionWorkflowStepper } from '../components/corrective-actions/CorrectiveActionWorkflowStepper';
import { CorrectiveActionSourceBadge } from '../components/corrective-actions/CorrectiveActionSourceBadge';
import { CorrectiveActionEvidencePanel } from '../components/corrective-actions/CorrectiveActionEvidencePanel';
import type { PendingEvidence } from '../components/corrective-actions/CorrectiveActionEvidenceUpload';
import { ResponseSubmissionForm } from '../components/corrective-actions/ResponseSubmissionForm';
import { RejectionForm } from '../components/corrective-actions/RejectionForm';
import { CorrectiveActionRelatedRecordsPanel } from '../components/corrective-actions/CorrectiveActionRelatedRecordsPanel';
import { CorrectiveActionDetailSkeleton } from '../components/corrective-actions/CorrectiveActionDetailSkeleton';
import {
  CorrectiveActionForm,
  type ValidatedCorrectiveActionFormData,
} from '../components/corrective-actions/CorrectiveActionForm';
import {
  addCorrectiveActionComment,
  addCorrectiveActionEvidence,
  getCorrectiveAction,
  updateCorrectiveAction,
} from '../lib/correctiveActionsApi';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { useAuth } from '../lib/AuthContext';
import { canEditCorrectiveAction } from '../lib/roles';
import type { CorrectiveActionDetail, CorrectiveActionStatus, UpdateCorrectiveActionPayload } from '../lib/correctiveActionTypes';

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

export function CorrectiveActionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { user } = useAuth();
  const role = user!.role;

  const [action, setAction] = useState<CorrectiveActionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    getCorrectiveAction(id)
      .then((detail) => setAction(detail))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof Error ? err.message : 'Could not load corrective action.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function performStatusChange(status: CorrectiveActionStatus, extra?: UpdateCorrectiveActionPayload) {
    if (!action) return;
    try {
      const updated = await updateCorrectiveAction(action.id, { status, actor: user!.name, ...extra });
      setAction(updated);
      showToast('success', `Status updated to "${status}".`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update status.');
    }
  }

  async function handleSubmitResponse(input: { responseNote: string; evidenceNote: string }) {
    if (!action) return;
    const updated = await updateCorrectiveAction(action.id, {
      responseNote: input.responseNote,
      evidenceNote: input.evidenceNote,
      status: 'Awaiting Verification',
      actor: user!.name,
    });
    setAction(updated);
    setShowResponseForm(false);
    showToast('success', 'Response submitted for verification.');
  }

  async function handleSendBack(reason: string) {
    if (!action) return;
    const updated = await updateCorrectiveAction(action.id, { status: 'In Progress', actor: user!.name });
    setAction(updated);
    await addCorrectiveActionComment(action.id, { author: user!.name, message: `Sent back: ${reason}` });
    const refreshed = await getCorrectiveAction(action.id);
    setAction(refreshed);
    setShowRejectionForm(false);
    showToast('success', 'Sent back for further work.');
  }

  function requestVerify() {
    if (!action) return;
    setConfirmState({
      title: 'Verify this corrective action?',
      message: 'This confirms the response and evidence are satisfactory. The action can then be closed.',
      confirmLabel: 'Verify',
      onConfirm: () => {
        setConfirmState(null);
        void performStatusChange('Verified', { verifiedBy: user!.name });
      },
    });
  }

  function requestClose() {
    setConfirmState({
      title: 'Close this corrective action?',
      message: 'Closing marks this corrective action as fully complete. You can reopen it later if needed.',
      confirmLabel: 'Close',
      danger: true,
      onConfirm: () => {
        setConfirmState(null);
        void performStatusChange('Closed');
      },
    });
  }

  function requestReopen() {
    setConfirmState({
      title: 'Reopen this corrective action?',
      message: 'This will move the action back to Verified so it can be closed again once ready.',
      confirmLabel: 'Reopen',
      onConfirm: () => {
        setConfirmState(null);
        void performStatusChange('Verified');
      },
    });
  }

  async function handleUploadEvidence(files: PendingEvidence[]) {
    if (!action) return;
    await addCorrectiveActionEvidence(action.id, {
      files: files.map((f) => ({ fileName: f.fileName, fileSize: f.fileSize, mimeType: f.mimeType, dataUrl: f.dataUrl })),
      uploadedBy: user!.name,
    });
    const refreshed = await getCorrectiveAction(action.id);
    setAction(refreshed);
    showToast('success', 'Evidence uploaded.');
  }

  async function handleAddComment(message: string) {
    if (!action) return;
    await addCorrectiveActionComment(action.id, { author: user!.name, message });
    const refreshed = await getCorrectiveAction(action.id);
    setAction(refreshed);
    showToast('success', 'Comment added.');
  }

  async function handleEditSubmit(data: ValidatedCorrectiveActionFormData) {
    if (!action) return;
    const payload: UpdateCorrectiveActionPayload = {
      title: data.title,
      description: data.description,
      workplace: data.workplace,
      department: data.department,
      location: data.location,
      priority: data.priority,
      dueDate: data.dueDate,
      assignedTo: data.assignedTo,
      actor: user!.name,
    };
    const updated = await updateCorrectiveAction(action.id, payload);
    setAction(updated);
    setEditing(false);
    showToast('success', 'Changes saved successfully.');
  }

  if (loading) return <CorrectiveActionDetailSkeleton />;

  if (notFound) {
    return (
      <>
        <PageHeader title="Corrective Action Not Found" />
        <EmptyState
          icon={AlertTriangle}
          title="No matching corrective action"
          description={`No corrective action exists for ID "${id}".`}
          action={
            <Link to="/corrective-actions">
              <Button variant="secondary" className="mt-2">
                Back to Corrective Actions
              </Button>
            </Link>
          }
        />
      </>
    );
  }

  if (error || !action) {
    return (
      <>
        <PageHeader title="Corrective Action" />
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load corrective action"
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

  if (editing) {
    return (
      <>
        <PageHeader title={`Edit ${action.referenceNumber}`} description="Update the details of this corrective action." />
        <CorrectiveActionForm
          mode="edit"
          initialValues={{ ...action, externalSourceReference: action.externalSourceReference ?? '' }}
          submitLabel="Save Changes"
          onSubmit={handleEditSubmit}
          onCancel={() => setEditing(false)}
        />
      </>
    );
  }

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'evidence', label: 'Evidence', badge: action.evidence.length },
    { id: 'comments', label: 'Comments', badge: action.comments.length },
    { id: 'activity', label: 'Activity', badge: action.activity.length },
    { id: 'related', label: 'Related Records' },
  ];

  return (
    <>
      <CorrectiveActionDetailHeader
        action={action}
        actions={
          canEditCorrectiveAction(role) && (
            <Button variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )
        }
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CorrectiveActionSourceBadge action={action} />
      </div>

      <div className="mt-3">
        <CorrectiveActionWorkflowStepper action={action} />
      </div>

      <div className="mt-4">
        {!showResponseForm && !showRejectionForm && (
          <CorrectiveActionQuickActionsBar
            status={action.status}
            role={role}
            onStartWork={() => void performStatusChange('In Progress')}
            onSubmitResponse={() => setShowResponseForm(true)}
            onVerify={requestVerify}
            onSendBack={() => setShowRejectionForm(true)}
            onClose={requestClose}
            onReopen={requestReopen}
          />
        )}

        {showResponseForm && (
          <div className="mb-4">
            <ResponseSubmissionForm onSubmit={handleSubmitResponse} onCancel={() => setShowResponseForm(false)} />
          </div>
        )}

        {showRejectionForm && (
          <div className="mb-4">
            <RejectionForm onSubmit={handleSendBack} onCancel={() => setShowRejectionForm(false)} />
          </div>
        )}
      </div>

      <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

      <div className="mt-4">
        {activeTab === 'overview' && (
          <SectionCard title="Overview">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Description</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-body">{action.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Response</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-body">{action.responseNote || 'No response submitted yet.'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Evidence</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-body">{action.evidenceNote || 'No evidence submitted yet.'}</p>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {activeTab === 'evidence' && (
          <SectionCard title="Evidence" description="Photos, PDFs, and documents supporting this corrective action.">
            <CorrectiveActionEvidencePanel evidence={action.evidence} onUpload={handleUploadEvidence} />
          </SectionCard>
        )}

        {activeTab === 'comments' && (
          <SectionCard title="Comments" description="Discussion between the responsible person and safety officer.">
            <CommentsSection comments={action.comments} onAdd={handleAddComment} />
          </SectionCard>
        )}

        {activeTab === 'activity' && (
          <SectionCard title="Activity" description="System-recorded history for this corrective action.">
            <ActivityTimeline items={action.activity} />
          </SectionCard>
        )}

        {activeTab === 'related' && <CorrectiveActionRelatedRecordsPanel action={action} />}
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
