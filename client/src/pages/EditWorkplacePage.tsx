import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { LoadingState } from '../components/LoadingState';
import { WorkplaceBuilder } from '../components/workplaces/WorkplaceBuilder';
import type { WorkplaceMetaValues } from '../components/workplaces/WorkplaceMetaFields';
import { getWorkplace, listWorkplaces, updateWorkplace } from '../lib/workplacesApi';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import type { AreaInput, Workplace } from '../lib/workplaceTypes';

export function EditWorkplacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [workplace, setWorkplace] = useState<Workplace | null>(null);
  const [organisationSuggestions, setOrganisationSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    getWorkplace(id)
      .then((w) => setWorkplace(w))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof Error ? err.message : 'Could not load workplace.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listWorkplaces()
      .then((all) => setOrganisationSuggestions(Array.from(new Set(all.map((w) => w.organisation))).sort()))
      .catch(() => setOrganisationSuggestions([]));
  }, []);

  async function handleSave(meta: WorkplaceMetaValues, areas: AreaInput[]) {
    if (!workplace) return;
    const updated = await updateWorkplace(workplace.id, {
      organisation: meta.organisation.trim(),
      name: meta.name.trim(),
      code: meta.code.trim(),
      industry: meta.industry.trim(),
      address: meta.address.trim(),
      areas,
    });
    showToast('success', `Workplace "${updated.name}" saved.`);
    navigate(`/workplaces/${updated.id}`);
  }

  if (loading) return <LoadingState label="Loading workplace…" />;

  if (notFound) {
    return (
      <>
        <PageHeader title="Workplace Not Found" />
        <EmptyState
          icon={AlertTriangle}
          title="No matching workplace"
          description={`No workplace exists for ID "${id}".`}
          action={
            <Link to="/workplaces">
              <Button variant="secondary" className="mt-2">
                Back to Workplaces
              </Button>
            </Link>
          }
        />
      </>
    );
  }

  if (error || !workplace) {
    return (
      <>
        <PageHeader title="Edit Workplace" />
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load workplace"
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
      <PageHeader title={`Edit ${workplace.name}`} description="Update site details, areas, and specific locations." />
      <WorkplaceBuilder
        initialWorkplace={workplace}
        organisationSuggestions={organisationSuggestions}
        saveLabel="Save Changes"
        onSave={handleSave}
        onCancel={() => navigate(`/workplaces/${workplace.id}`)}
      />
    </>
  );
}
