import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Archive, CheckCircle2, Copy, Pencil, Plus } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { TemplateQuestionPreview } from '../components/inspection-templates/TemplateQuestionPreview';
import { getTemplate, updateTemplate, duplicateTemplate } from '../lib/inspectionTemplatesApi';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { formatDate } from '../lib/format';
import type { InspectionTemplate } from '../lib/inspectionTemplateTypes';

export function InspectionTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [template, setTemplate] = useState<InspectionTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    getTemplate(id)
      .then((t) => setTemplate(t))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof Error ? err.message : 'Could not load template.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(status: 'Active' | 'Archived') {
    if (!template) return;
    setBusy(true);
    try {
      const updated = await updateTemplate(template.id, { status });
      setTemplate(updated);
      showToast('success', `Template ${status.toLowerCase()}.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update template.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate() {
    if (!template) return;
    setBusy(true);
    try {
      const duplicate = await duplicateTemplate(template.id);
      showToast('success', `Duplicated as "${duplicate.name}".`);
      navigate(`/inspection-templates/${duplicate.id}/edit`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not duplicate template.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading template…" />;

  if (notFound) {
    return (
      <>
        <PageHeader title="Template Not Found" />
        <EmptyState
          icon={AlertTriangle}
          title="No matching template"
          description={`No inspection template exists for ID "${id}".`}
          action={
            <Link to="/inspection-templates">
              <Button variant="secondary" className="mt-2">
                Back to Templates
              </Button>
            </Link>
          }
        />
      </>
    );
  }

  if (error || !template) {
    return (
      <>
        <PageHeader title="Inspection Template" />
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load template"
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

  const totalQuestions = template.sections.reduce((sum, s) => sum + s.questions.length, 0);

  return (
    <>
      <PageHeader
        title={template.name}
        description={`${template.code} · v${template.version} · ${template.category}`}
        action={
          <div className="flex flex-wrap gap-2">
            {template.status === 'Active' && (
              <Link to={`/inspections/new?templateId=${template.id}`}>
                <Button variant="primary">
                  <Plus className="h-4 w-4" />
                  New Inspection
                </Button>
              </Link>
            )}
            <Link to={`/inspection-templates/${template.id}/edit`}>
              <Button variant="secondary">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button variant="secondary" loading={busy} onClick={handleDuplicate}>
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
            {template.status !== 'Active' && (
              <Button variant="secondary" loading={busy} onClick={() => handleStatusChange('Active')}>
                <CheckCircle2 className="h-4 w-4" />
                Activate
              </Button>
            )}
            {template.status !== 'Archived' && (
              <Button variant="secondary" loading={busy} onClick={() => handleStatusChange('Archived')}>
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            )}
          </div>
        }
      />

      <SectionCard title="Overview">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={template.status} />
          <span className="text-xs text-muted">
            {template.sections.length} section{template.sections.length === 1 ? '' : 's'} &middot; {totalQuestions}{' '}
            question{totalQuestions === 1 ? '' : 's'} &middot; updated {formatDate(template.updatedAt)}
          </span>
        </div>
        {template.description && <p className="mt-3 text-sm text-body">{template.description}</p>}
        {template.applicableIndustries.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {template.applicableIndustries.map((tag) => (
              <span key={tag} className="rounded-md border border-border bg-canvas-raised px-2 py-0.5 text-xs text-muted">
                {tag}
              </span>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="mt-4 space-y-3">
        {template.sections.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No sections yet" description="Edit this template to add sections and questions." />
        ) : (
          <>
            <p className="text-xs text-muted">
              This is exactly how the checklist will look when someone fills it out during an inspection.
            </p>
            {template.sections
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <SectionCard key={section.id} title={section.title} description={section.description || undefined}>
                  {section.questions.length === 0 ? (
                    <p className="text-xs italic text-muted">No questions in this section.</p>
                  ) : (
                    <div className="space-y-3">
                      {section.questions
                        .slice()
                        .sort((a, b) => a.order - b.order)
                        .map((question, index) => (
                          <TemplateQuestionPreview key={question.id} question={question} number={index + 1} />
                        ))}
                    </div>
                  )}
                </SectionCard>
              ))}
          </>
        )}
      </div>
    </>
  );
}
