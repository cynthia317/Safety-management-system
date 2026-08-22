import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Building2, CheckCircle2, MapPin, Pencil, PowerOff } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { WorkplaceHierarchyView } from '../components/workplaces/WorkplaceHierarchyView';
import { getWorkplace, updateWorkplace } from '../lib/workplacesApi';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { formatDate } from '../lib/format';
import type { Workplace } from '../lib/workplaceTypes';

export function WorkplaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [workplace, setWorkplace] = useState<Workplace | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function handleStatusChange(status: 'Active' | 'Inactive') {
    if (!workplace) return;
    setBusy(true);
    try {
      const updated = await updateWorkplace(workplace.id, { status });
      setWorkplace(updated);
      showToast('success', `Workplace marked as ${status}.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update workplace.');
    } finally {
      setBusy(false);
    }
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
        <PageHeader title="Workplace" />
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

  const areaCount = workplace.areas.length;
  const locationCount = workplace.areas.reduce((sum, a) => sum + a.locations.length, 0);

  return (
    <>
      <PageHeader
        title={workplace.name}
        description={`${workplace.organisation}${workplace.code ? ` · ${workplace.code}` : ''}${workplace.industry ? ` · ${workplace.industry}` : ''}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link to={`/workplaces/${workplace.id}/edit`}>
              <Button variant="secondary">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            {workplace.status === 'Active' ? (
              <Button variant="secondary" loading={busy} onClick={() => handleStatusChange('Inactive')}>
                <PowerOff className="h-4 w-4" />
                Mark Inactive
              </Button>
            ) : (
              <Button variant="secondary" loading={busy} onClick={() => handleStatusChange('Active')}>
                <CheckCircle2 className="h-4 w-4" />
                Mark Active
              </Button>
            )}
          </div>
        }
      />

      <SectionCard title="Overview">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={workplace.status} />
          <span className="text-xs text-muted">
            {areaCount} area{areaCount === 1 ? '' : 's'} &middot; {locationCount} specific location
            {locationCount === 1 ? '' : 's'} &middot; updated {formatDate(workplace.updatedAt)}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              <Building2 className="h-3.5 w-3.5" />
              Organisation
            </dt>
            <dd className="mt-0.5 text-sm text-body">{workplace.organisation}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Industry / Type</dt>
            <dd className="mt-0.5 text-sm text-body">{workplace.industry || 'Not specified'}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              <MapPin className="h-3.5 w-3.5" />
              Address
            </dt>
            <dd className="mt-0.5 text-sm text-body">{workplace.address || 'Not specified'}</dd>
          </div>
        </dl>
      </SectionCard>

      <div className="mt-4">
        <p className="mb-2 text-xs text-muted">
          {workplace.organisation} → {workplace.name} → Area / Department / Unit → Specific Location
        </p>
        <WorkplaceHierarchyView workplace={workplace} />
      </div>
    </>
  );
}
