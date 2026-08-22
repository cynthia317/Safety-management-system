import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { Button } from '../components/Button';
import { Input } from '../components/form/Input';
import { Select } from '../components/form/Select';
import { listWorkplaces } from '../lib/workplacesApi';
import { WORKPLACE_STATUSES } from '../lib/workplaceOptions';
import type { Workplace, WorkplaceStatus } from '../lib/workplaceTypes';

export function WorkplaceListPage() {
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [organisation, setOrganisation] = useState('all');
  const [status, setStatus] = useState<WorkplaceStatus | 'all'>('all');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listWorkplaces()
      .then((data) => {
        if (cancelled) return;
        setWorkplaces(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load workplaces.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const organisationOptions = useMemo(
    () => Array.from(new Set(workplaces.map((w) => w.organisation).filter(Boolean))).sort(),
    [workplaces],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return workplaces
      .filter((w) => {
        if (organisation !== 'all' && w.organisation !== organisation) return false;
        if (status !== 'all' && w.status !== status) return false;
        if (term && !`${w.name} ${w.code} ${w.organisation}`.toLowerCase().includes(term)) return false;
        return true;
      })
      .sort((a, b) => a.organisation.localeCompare(b.organisation) || a.name.localeCompare(b.name));
  }, [workplaces, search, organisation, status]);

  const columns: DataTableColumn<Workplace>[] = [
    {
      key: 'organisation',
      header: 'Organisation',
      render: (w) => <span className="text-body">{w.organisation}</span>,
    },
    {
      key: 'name',
      header: 'Workplace / Site',
      render: (w) => (
        <div>
          <Link to={`/workplaces/${w.id}`} className="text-sm font-medium text-heading hover:text-accent">
            {w.name}
          </Link>
          {w.code && <p className="font-mono text-xs text-muted">{w.code}</p>}
        </div>
      ),
    },
    { key: 'industry', header: 'Industry', render: (w) => <span className="text-xs text-muted">{w.industry || '—'}</span> },
    {
      key: 'size',
      header: 'Areas / Locations',
      render: (w) => (
        <span className="text-xs text-muted">
          {w.areas.length} area{w.areas.length === 1 ? '' : 's'} &middot;{' '}
          {w.areas.reduce((sum, a) => sum + a.locations.length, 0)} location
          {w.areas.reduce((sum, a) => sum + a.locations.length, 0) === 1 ? '' : 's'}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (w) => <StatusBadge status={w.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'w-8',
      render: (w) => (
        <Link
          to={`/workplaces/${w.id}`}
          className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-heading"
          aria-label={`Open ${w.name}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Workplaces"
        description="Organisation → Workplace / Site → Area / Department / Unit → Specific Location."
        action={
          <Link to="/workplaces/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" />
              New Workplace
            </Button>
          </Link>
        }
      />

      <SectionCard
        title="All Workplaces"
        description={loading ? 'Loading…' : `${filtered.length} of ${workplaces.length} workplaces`}
        noPadding
      >
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border p-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, or organisation…"
            className="min-w-[220px] flex-1"
            aria-label="Search workplaces"
          />
          <Select
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            aria-label="Filter by organisation"
            className="w-auto min-w-[180px]"
          >
            <option value="all">All Organisations</option>
            {organisationOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as WorkplaceStatus | 'all')}
            aria-label="Filter by status"
            className="w-auto min-w-[140px]"
          >
            <option value="all">All Statuses</option>
            {WORKPLACE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <LoadingState label="Loading workplaces…" />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load workplaces"
            description={error}
            action={
              <Button variant="secondary" className="mt-2" onClick={() => setReloadToken((t) => t + 1)}>
                Retry
              </Button>
            }
          />
        ) : (
          <DataTable columns={columns} data={filtered} getRowKey={(w) => w.id} emptyMessage="No workplaces match your filters." />
        )}
      </SectionCard>
    </>
  );
}
