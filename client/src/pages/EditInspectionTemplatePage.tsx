import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { LoadingState } from '../components/LoadingState';
import { TemplateBuilder } from '../components/inspection-templates/TemplateBuilder';
import type { TemplateMetaValues } from '../components/inspection-templates/TemplateMetaFields';
import { getTemplate, updateTemplate } from '../lib/inspectionTemplatesApi';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import type { InspectionTemplate, SectionInput, TemplateCategory } from '../lib/inspectionTemplateTypes';

export function EditInspectionTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [template, setTemplate] = useState<InspectionTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSave(meta: TemplateMetaValues, sections: SectionInput[]) {
    if (!template) return;
    const updated = await updateTemplate(template.id, {
      name: meta.name.trim(),
      code: meta.code.trim(),
      description: meta.description.trim(),
      category: meta.category as TemplateCategory,
      applicableIndustries: meta.applicableIndustries,
      sections,
    });
    showToast('success', `Template "${updated.name}" saved (v${updated.version}).`);
    navigate(`/inspection-templates/${updated.id}`);
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
        <PageHeader title="Edit Template" />
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

  return (
    <>
      <PageHeader
        title={`Edit ${template.name}`}
        description={`v${template.version} · Saving creates a new version. Past inspections keep the version they were created with.`}
      />
      <TemplateBuilder
        initialTemplate={template}
        saveLabel="Save Changes"
        onSave={handleSave}
        onCancel={() => navigate(`/inspection-templates/${template.id}`)}
      />
    </>
  );
}
