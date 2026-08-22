import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, LogOut } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { QuestionCard, type QuestionDraft } from '../components/inspections/QuestionCard';
import { SectionNavigator } from '../components/inspections/SectionNavigator';
import { InspectionProgressBar } from '../components/inspections/InspectionProgressBar';
import { InspectionDetailSkeleton } from '../components/inspections/InspectionDetailSkeleton';
import { getInspection, saveResponses } from '../lib/inspectionsApi';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { useAuth } from '../lib/AuthContext';
import { computeOverallProgress, computeSectionProgress } from '../lib/inspectionProgress';
import { formatDate } from '../lib/format';
import type { InspectionDetail, QuestionResponse, ResponseInput } from '../lib/inspectionTypes';
import type { TemplateQuestion } from '../lib/inspectionTemplateTypes';

function draftsFromResponses(inspection: InspectionDetail): Record<string, QuestionDraft> {
  const drafts: Record<string, QuestionDraft> = {};
  for (const section of inspection.templateSnapshot.sections) {
    for (const question of section.questions) {
      const existing = inspection.responses.find((r) => r.questionId === question.id);
      drafts[question.id] = existing
        ? {
            value: existing.value,
            notes: existing.notes,
            evidenceNote: existing.evidenceNote,
            potentialFinding: existing.potentialFinding,
          }
        : { value: '', notes: '', evidenceNote: '', potentialFinding: null };
    }
  }
  return drafts;
}

export function InspectionConductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, QuestionDraft>>({});
  const [activeSectionId, setActiveSectionId] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    getInspection(id)
      .then((detail) => {
        setInspection(detail);
        setDrafts(draftsFromResponses(detail));
        setActiveSectionId(detail.templateSnapshot.sections[0]?.id ?? '');
        setDirty(false);
      })
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
    function handler(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const questionIndex = useMemo(() => {
    const map = new Map<string, { question: TemplateQuestion; sectionId: string }>();
    if (!inspection) return map;
    for (const section of inspection.templateSnapshot.sections) {
      for (const question of section.questions) map.set(question.id, { question, sectionId: section.id });
    }
    return map;
  }, [inspection]);

  const progressSource = useMemo(() => {
    if (!inspection) return null;
    const responses: QuestionResponse[] = Object.entries(drafts)
      .filter(([, draft]) => draft.value.trim() !== '')
      .map(([questionId, draft]) => {
        const ctx = questionIndex.get(questionId);
        return {
          questionId,
          sectionId: ctx?.sectionId ?? '',
          responseType: ctx?.question.responseType ?? 'text',
          value: draft.value,
          notes: draft.notes,
          evidenceNote: draft.evidenceNote,
          potentialFinding: draft.potentialFinding,
          answeredAt: '',
        };
      });
    return { templateSnapshot: inspection.templateSnapshot, responses };
  }, [inspection, drafts, questionIndex]);

  const overallProgress = progressSource ? computeOverallProgress(progressSource) : { answered: 0, total: 0, percent: 0 };
  const sectionProgress = progressSource ? computeSectionProgress(progressSource) : [];
  const activeSection = inspection?.templateSnapshot.sections.find((s) => s.id === activeSectionId);
  const activeSectionIndex = inspection?.templateSnapshot.sections.findIndex((s) => s.id === activeSectionId) ?? -1;
  const isLastSection = inspection ? activeSectionIndex === inspection.templateSnapshot.sections.length - 1 : false;
  const isFirstSection = activeSectionIndex === 0;

  function updateDraft(questionId: string, update: Partial<QuestionDraft>) {
    setDrafts((prev) => {
      const existing: QuestionDraft = prev[questionId] ?? {
        value: '',
        notes: '',
        evidenceNote: '',
        potentialFinding: null,
      };
      return { ...prev, [questionId]: { ...existing, ...update } };
    });
    setDirty(true);
  }

  function buildResponseInputs(): ResponseInput[] {
    return Object.entries(drafts)
      .filter(([, draft]) => draft.value.trim() !== '')
      .map(([questionId, draft]) => {
        const ctx = questionIndex.get(questionId);
        return {
          questionId,
          sectionId: ctx?.sectionId ?? '',
          responseType: ctx?.question.responseType ?? 'text',
          value: draft.value,
          notes: draft.notes,
          evidenceNote: draft.evidenceNote,
          potentialFinding: draft.potentialFinding,
        };
      });
  }

  async function persist(): Promise<boolean> {
    if (!inspection) return false;
    const responseInputs = buildResponseInputs();
    if (responseInputs.length === 0) return true;

    setSaving(true);
    try {
      const updated = await saveResponses(inspection.id, responseInputs, user!.name);
      setInspection(updated);
      setDirty(false);
      return true;
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not save responses.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    const ok = await persist();
    if (ok) showToast('success', 'Progress saved.');
  }

  async function handleSaveAndContinue() {
    const ok = await persist();
    if (!ok) return;
    if (isLastSection) {
      navigate(`/inspections/${inspection?.id}/review`);
    } else if (inspection) {
      const next = inspection.templateSnapshot.sections[activeSectionIndex + 1];
      if (next) setActiveSectionId(next.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function goPrevious() {
    if (!inspection || isFirstSection) return;
    const previous = inspection.templateSnapshot.sections[activeSectionIndex - 1];
    if (previous) setActiveSectionId(previous.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goNext() {
    if (!inspection) return;
    if (isLastSection) {
      navigate(`/inspections/${inspection.id}/review`);
    } else {
      const next = inspection.templateSnapshot.sections[activeSectionIndex + 1];
      if (next) setActiveSectionId(next.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleExit() {
    if (dirty) {
      setShowExitConfirm(true);
    } else {
      navigate(`/inspections/${inspection?.id}`);
    }
  }

  if (loading) {
    return <InspectionDetailSkeleton />;
  }

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

  if (inspection.status === 'Submitted' || inspection.status === 'Reviewed' || inspection.status === 'Closed') {
    return (
      <>
        <PageHeader title={inspection.title} description={inspection.referenceNumber} />
        <EmptyState
          icon={AlertTriangle}
          title="This inspection has already been submitted"
          description="Submitted inspections are locked for normal editing. View the inspection to see its findings and activity."
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

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-surface p-4">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted">{inspection.referenceNumber}</p>
          <h1 className="mt-0.5 text-lg font-semibold text-heading">{inspection.title}</h1>
          <p className="mt-1 text-xs text-muted">
            {inspection.workplace} / {inspection.area} &middot; {inspection.leadInspector} &middot;{' '}
            {formatDate(inspection.inspectionDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <InspectionProgressBar progress={overallProgress} />
          <Button variant="ghost" onClick={handleExit}>
            <LogOut className="h-4 w-4" />
            Exit
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <SectionNavigator sections={sectionProgress} activeSectionId={activeSectionId} onSelect={setActiveSectionId} />

        <div className="min-w-0 flex-1 space-y-3 pb-24 lg:pb-0">
          {activeSection && (
            <SectionCard title={activeSection.title} description={activeSection.description || undefined}>
              <div className="space-y-3">
                {activeSection.questions.length === 0 ? (
                  <p className="text-sm text-muted">This section has no questions.</p>
                ) : (
                  activeSection.questions
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((question, index) => (
                      <QuestionCard
                        key={question.id}
                        question={question}
                        number={index + 1}
                        draft={drafts[question.id] ?? { value: '', notes: '', evidenceNote: '', potentialFinding: null }}
                        onUpdate={(update) => updateDraft(question.id, update)}
                      />
                    ))
                )}
              </div>
            </SectionCard>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface p-3">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={goPrevious} disabled={isFirstSection}>
                Previous
              </Button>
              <Button variant="secondary" onClick={goNext}>
                Next
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" loading={saving} onClick={handleSaveDraft}>
                Save Draft
              </Button>
              <Button variant="primary" loading={saving} onClick={handleSaveAndContinue}>
                {isLastSection ? 'Save & Review' : 'Save & Continue'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showExitConfirm && (
        <ConfirmDialog
          title="Leave without saving?"
          message="You have unsaved changes. You can save your progress before leaving, or discard the changes."
          confirmLabel="Save & Exit"
          onConfirm={() => {
            setShowExitConfirm(false);
            void persist().then((ok) => {
              if (ok) navigate(`/inspections/${inspection.id}`);
            });
          }}
          onCancel={() => setShowExitConfirm(false)}
        />
      )}
    </>
  );
}
