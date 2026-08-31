import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, File as FileIcon, FileText, Image as ImageIcon, Plus, ShieldAlert, Wrench } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { Tabs, type TabItem } from '../components/Tabs';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { FormField } from '../components/form/FormField';
import { Input } from '../components/form/Input';
import { Textarea } from '../components/form/Textarea';
import { CorrectiveActionEvidenceUpload, type PendingEvidence } from '../components/corrective-actions/CorrectiveActionEvidenceUpload';
import { getIncident, updateIncident, addIncidentComment, addIncidentEvidence } from '../lib/incidentsApi';
import { listCorrectiveActions } from '../lib/correctiveActionsApi';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';
import { ApiError } from '../lib/api';
import { formatDate, formatDateTime, formatFileSize } from '../lib/format';
import { canAssignIncidentInvestigator, canCloseIncident, canManageIncidents } from '../lib/roles';
import type { IncidentDetail, IncidentStatus } from '../lib/incidentTypes';
import type { CorrectiveAction } from '../lib/correctiveActionTypes';

const STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  Reported: ['Under Investigation'],
  'Under Investigation': ['Action Required', 'Resolved'],
  'Action Required': ['Resolved'],
  Resolved: ['Closed'],
  Closed: ['Resolved'],
};

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [linkedActions, setLinkedActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [busy, setBusy] = useState(false);

  const [investigatorInput, setInvestigatorInput] = useState('');
  const [investigationForm, setInvestigationForm] = useState({
    investigationSummary: '',
    rootCause: '',
    contributingFactors: '',
    lessonsLearned: '',
  });
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidence[]>([]);
  const [addingEvidence, setAddingEvidence] = useState(false);
  const [commentText, setCommentText] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    Promise.all([getIncident(id), listCorrectiveActions({ incidentId: id })])
      .then(([inc, actions]) => {
        setIncident(inc);
        setLinkedActions(actions.items);
        setInvestigatorInput(inc.leadInvestigator);
        setInvestigationForm({
          investigationSummary: inc.investigationSummary,
          rootCause: inc.rootCause,
          contributingFactors: inc.contributingFactors,
          lessonsLearned: inc.lessonsLearned,
        });
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof Error ? err.message : 'Could not load incident.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpdate(payload: Parameters<typeof updateIncident>[1], successMessage: string) {
    if (!incident) return;
    setBusy(true);
    try {
      const updated = await updateIncident(incident.id, payload);
      setIncident(updated);
      showToast('success', successMessage);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update this incident.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignInvestigator() {
    if (!investigatorInput.trim()) return;
    await handleUpdate({ leadInvestigator: investigatorInput.trim() }, 'Investigator assigned.');
  }

  async function handleStatusChange(status: IncidentStatus) {
    const payload: Parameters<typeof updateIncident>[1] =
      status === 'Closed' ? { status, investigationSummary: investigationForm.investigationSummary } : { status };
    await handleUpdate(payload, `Status changed to ${status}.`);
  }

  async function handleSaveInvestigation() {
    await handleUpdate(investigationForm, 'Investigation updated.');
  }

  async function handleUploadEvidence() {
    if (!incident || !user || pendingEvidence.length === 0) return;
    setBusy(true);
    try {
      await addIncidentEvidence(incident.id, {
        uploadedBy: user.name,
        files: pendingEvidence.map(({ fileName, fileSize, mimeType, dataUrl }) => ({ fileName, fileSize, mimeType, dataUrl })),
      });
      setPendingEvidence([]);
      setAddingEvidence(false);
      load();
      showToast('success', 'Evidence uploaded.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not upload evidence.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddComment() {
    if (!incident || !user || !commentText.trim()) return;
    setBusy(true);
    try {
      await addIncidentComment(incident.id, { author: user.name, message: commentText.trim() });
      setCommentText('');
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not add comment.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading incident…" />;

  if (notFound) {
    return (
      <>
        <PageHeader title="Incident Not Found" />
        <EmptyState
          icon={AlertTriangle}
          title="No matching incident"
          description={`No incident exists for ID "${id}".`}
          action={
            <Link to="/incidents">
              <Button variant="secondary" className="mt-2">
                Back to Incidents
              </Button>
            </Link>
          }
        />
      </>
    );
  }

  if (error || !incident) {
    return (
      <>
        <PageHeader title="Incident" />
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load incident"
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

  const role = user?.role;
  const canEdit = role ? canManageIncidents(role) : false;
  const canAssign = role ? canAssignIncidentInvestigator(role) : false;
  const canClose = role ? canCloseIncident(role) : false;
  const isReopeningFromClosed = incident.status === 'Closed';
  const nextStatuses: IncidentStatus[] = STATUS_TRANSITIONS[incident.status].filter((candidate: IncidentStatus) => {
    const isClosingTransition = candidate === 'Closed';
    return isClosingTransition || isReopeningFromClosed ? canClose : true;
  });

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'investigation', label: 'Investigation' },
    { id: 'actions', label: 'Corrective Actions', badge: linkedActions.length },
    { id: 'evidence', label: 'Evidence', badge: incident.evidence.length },
    { id: 'activity', label: 'Activity', badge: incident.activity.length },
  ];

  return (
    <>
      <PageHeader
        title={incident.title}
        description={`${incident.referenceNumber} · ${incident.eventType === 'NearMiss' ? 'Near Miss' : 'Incident'} · ${incident.category}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/hazards/new?incidentId=${incident.id}`}>
              <Button variant="secondary">
                <ShieldAlert className="h-4 w-4" />
                Create Hazard
              </Button>
            </Link>
            <Link to={`/corrective-actions/new?incidentId=${incident.id}&incidentReferenceNumber=${incident.referenceNumber}`}>
              <Button variant="secondary">
                <Wrench className="h-4 w-4" />
                Create Corrective Action
              </Button>
            </Link>
          </div>
        }
      />

      <SectionCard title="Status">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={incident.status} />
          <RiskBadge level={incident.potentialSeverity} />
          <span className="text-xs text-muted">
            {incident.workplace} &middot; {incident.department} &middot; {formatDate(incident.eventDate)}
          </span>
        </div>

        {canEdit && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <FormField label="Lead Investigator" htmlFor="investigator">
              <div className="flex gap-2">
                <Input
                  id="investigator"
                  value={investigatorInput}
                  onChange={(e) => setInvestigatorInput(e.target.value)}
                  placeholder="Name"
                  disabled={!canAssign}
                  className="w-48"
                />
                <Button variant="secondary" onClick={handleAssignInvestigator} loading={busy} disabled={!canAssign}>
                  Assign
                </Button>
              </div>
            </FormField>

            {nextStatuses.length > 0 && (
              <div className="flex gap-2">
                {nextStatuses.map((s) => (
                  <Button key={s} variant={s === 'Closed' ? 'primary' : 'secondary'} loading={busy} onClick={() => handleStatusChange(s)}>
                    {incident.status === 'Closed' ? `Reopen (${s})` : `Move to ${s}`}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <div className="mt-4">
        <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
      </div>

      <div className="mt-4">
        {activeTab === 'overview' && (
          <SectionCard title="Overview">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Description</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-sm text-body">{incident.description}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Location</dt>
                <dd className="mt-0.5 text-sm text-body">{incident.location}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Reported By</dt>
                <dd className="mt-0.5 text-sm text-body">
                  {incident.reportedBy} &middot; {formatDateTime(incident.reportedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Actual Severity</dt>
                <dd className="mt-0.5"><RiskBadge level={incident.actualSeverity} /></dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">People Involved</dt>
                <dd className="mt-0.5 text-sm text-body">{incident.peopleInvolved || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Injury / Illness</dt>
                <dd className="mt-0.5 text-sm text-body">
                  {incident.injuryOccurred ? incident.injurySeverity ?? 'Yes' : 'None reported'}
                </dd>
              </div>
              {incident.immediateActionTaken && (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Immediate Action Taken</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-sm text-body">{incident.immediateActionTaken}</dd>
                </div>
              )}
              {incident.hazardId && (
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Linked Hazard</dt>
                  <dd className="mt-0.5">
                    <Link to={`/hazards/${incident.hazardId}`} className="font-mono text-xs font-medium text-accent hover:underline">
                      {incident.hazardReferenceNumber}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </SectionCard>
        )}

        {activeTab === 'investigation' && (
          <SectionCard title="Investigation" description="Filled in progressively as the investigation proceeds.">
            <div className="space-y-4">
              <FormField label="Investigation Summary" htmlFor="investigationSummary" required>
                <Textarea
                  id="investigationSummary"
                  value={investigationForm.investigationSummary}
                  onChange={(e) => setInvestigationForm((v) => ({ ...v, investigationSummary: e.target.value }))}
                  disabled={!canEdit}
                />
              </FormField>
              <FormField label="Root Cause" htmlFor="rootCause">
                <Textarea
                  id="rootCause"
                  rows={2}
                  value={investigationForm.rootCause}
                  onChange={(e) => setInvestigationForm((v) => ({ ...v, rootCause: e.target.value }))}
                  disabled={!canEdit}
                />
              </FormField>
              <FormField label="Contributing Factors" htmlFor="contributingFactors">
                <Textarea
                  id="contributingFactors"
                  rows={2}
                  value={investigationForm.contributingFactors}
                  onChange={(e) => setInvestigationForm((v) => ({ ...v, contributingFactors: e.target.value }))}
                  disabled={!canEdit}
                />
              </FormField>
              <FormField label="Lessons Learned" htmlFor="lessonsLearned">
                <Textarea
                  id="lessonsLearned"
                  rows={2}
                  value={investigationForm.lessonsLearned}
                  onChange={(e) => setInvestigationForm((v) => ({ ...v, lessonsLearned: e.target.value }))}
                  disabled={!canEdit}
                />
              </FormField>
              {canEdit && (
                <div className="flex justify-end">
                  <Button variant="primary" loading={busy} onClick={handleSaveInvestigation}>
                    Save Investigation
                  </Button>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {activeTab === 'actions' && (
          <SectionCard
            title="Corrective Actions"
            description="Actions created from this incident's investigation."
            action={
              <Link to={`/corrective-actions/new?incidentId=${incident.id}&incidentReferenceNumber=${incident.referenceNumber}`}>
                <Button variant="secondary">
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </Link>
            }
          >
            {linkedActions.length === 0 ? (
              <EmptyState icon={Wrench} title="No corrective actions yet" description="Create one from the button above." />
            ) : (
              <ul className="space-y-2">
                {linkedActions.map((action) => (
                  <li key={action.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <Link to={`/corrective-actions/${action.id}`} className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-medium text-accent hover:underline">{action.referenceNumber}</p>
                      <p className="truncate text-sm text-body">{action.title}</p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <RiskBadge level={action.priority} />
                      <StatusBadge status={action.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {activeTab === 'evidence' && (
          <SectionCard
            title="Evidence"
            action={
              !addingEvidence && (
                <Button variant="secondary" onClick={() => setAddingEvidence(true)}>
                  Add Evidence
                </Button>
              )
            }
          >
            {addingEvidence && (
              <div className="mb-4 space-y-3 rounded-md border border-border bg-surface p-3.5">
                <CorrectiveActionEvidenceUpload files={pendingEvidence} onChange={setPendingEvidence} />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setAddingEvidence(false);
                      setPendingEvidence([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" loading={busy} onClick={handleUploadEvidence}>
                    Upload
                  </Button>
                </div>
              </div>
            )}

            {incident.evidence.length === 0 ? (
              <EmptyState icon={ImageIcon} title="No evidence uploaded" description="Photos, PDFs, and documents will appear here." />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {incident.evidence.map((item) => (
                  <a
                    key={item.id}
                    href={item.dataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-md border border-border transition-colors hover:border-accent/50"
                  >
                    {item.mimeType.startsWith('image/') ? (
                      <img src={item.dataUrl} alt={item.fileName} className="h-28 w-full object-cover" />
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center bg-canvas-raised">
                        {item.mimeType === 'application/pdf' ? (
                          <FileText className="h-8 w-8 text-red-400" strokeWidth={1.5} />
                        ) : (
                          <FileIcon className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
                        )}
                      </div>
                    )}
                    <div className="bg-canvas-raised px-2 py-1.5">
                      <p className="truncate text-xs text-body">{item.fileName}</p>
                      <p className="text-[11px] text-muted">{formatFileSize(item.fileSize)}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'activity' && (
          <SectionCard title="Activity">
            <ActivityTimeline items={incident.activity} />
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <Textarea rows={2} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a note…" />
              <div className="flex justify-end">
                <Button variant="secondary" loading={busy} onClick={handleAddComment} disabled={!commentText.trim()}>
                  Add Note
                </Button>
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </>
  );
}
