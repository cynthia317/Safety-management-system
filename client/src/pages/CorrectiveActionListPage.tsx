import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ChevronRight, LayoutDashboard, Plus, Table2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import {
  CorrectiveActionFilters,
  DEFAULT_CORRECTIVE_ACTION_FILTERS,
  type CorrectiveActionFiltersState,
} from '../components/corrective-actions/CorrectiveActionFilters';
import { CorrectiveActionCard } from '../components/corrective-actions/CorrectiveActionCard';
import { CorrectiveActionListSkeleton } from '../components/corrective-actions/CorrectiveActionListSkeleton';
import { CorrectiveActionDashboard } from '../components/corrective-actions/CorrectiveActionDashboard';
import { listCorrectiveActions } from '../lib/correctiveActionsApi';
import { listWorkplaces } from '../lib/workplacesApi';
import { formatDueLabel } from '../lib/format';
import { isCorrectiveActionOverdue } from '../lib/correctiveActionOverdue';
import { useAuth } from '../lib/AuthContext';
import { canCreateCorrectiveAction } from '../lib/roles';
import type { PaginationMeta } from '../lib/pagination';
import type { CorrectiveAction } from '../lib/correctiveActionTypes';

const PAGE_SIZE = 20;

const ROW_ACCENT: Record<CorrectiveAction['priority'], string> = {
  Critical: 'border-l-2 border-l-red-500',
  High: 'border-l-2 border-l-orange-500',
  Medium: '',
  Low: '',
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function CorrectiveActionListPage() {
  const { user } = useAuth();
  const role = user!.role;
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<'register' | 'dashboard'>('register');
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CorrectiveActionFiltersState>(() => ({
    ...DEFAULT_CORRECTIVE_ACTION_FILTERS,
    status: (searchParams.get('status') as CorrectiveActionFiltersState['status']) ?? DEFAULT_CORRECTIVE_ACTION_FILTERS.status,
    priority: (searchParams.get('priority') as CorrectiveActionFiltersState['priority']) ?? DEFAULT_CORRECTIVE_ACTION_FILTERS.priority,
  }));
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get('overdue') === 'true');
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [workplaceOptions, setWorkplaceOptions] = useState<string[]>([]);

  useEffect(() => {
    listWorkplaces()
      .then((workplaces) => setWorkplaceOptions(workplaces.map((w) => w.name).sort()))
      .catch(() => {
        // Non-critical — the filter dropdown just stays empty.
      });
  }, []);

  const debouncedSearch = useDebouncedValue(filters.search, 300);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listCorrectiveActions({
      status: filters.status === 'all' ? undefined : filters.status,
      priority: filters.priority === 'all' ? undefined : filters.priority,
      workplace: filters.workplace === 'all' ? undefined : filters.workplace,
      overdue: overdueOnly || undefined,
      search: debouncedSearch || undefined,
      sort: filters.sort,
      page,
      pageSize: PAGE_SIZE,
    })
      .then(({ items, meta: pageMeta }) => {
        if (cancelled) return;
        setActions(items);
        setMeta(pageMeta ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load corrective actions.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.status, filters.priority, filters.workplace, filters.sort, overdueOnly, debouncedSearch, page, reloadToken]);

  function updateFilters(next: CorrectiveActionFiltersState) {
    setFilters(next);
    setOverdueOnly(false);
    setPage(1);
  }

  const columns: DataTableColumn<CorrectiveAction>[] = [
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (a) => (
        <Link to={`/corrective-actions/${a.id}`} className="font-mono text-xs font-medium text-accent hover:underline">
          {a.referenceNumber}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Corrective Action',
      render: (a) => (
        <div>
          <p className="font-medium text-heading">{a.title}</p>
          <p className="text-xs text-muted">{a.location}</p>
        </div>
      ),
    },
    {
      key: 'workplace',
      header: 'Workplace',
      render: (a) => (
        <div>
          <p className="text-body">{a.workplace}</p>
          <p className="text-xs text-muted">{a.department}</p>
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', render: (a) => <RiskBadge level={a.priority} /> },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'assignedTo',
      header: 'Responsible',
      render: (a) => (a.assignedTo ? <span className="text-body">{a.assignedTo}</span> : <span className="text-xs italic text-amber-400">Unassigned</span>),
    },
    {
      key: 'dueDate',
      header: 'Due',
      render: (a) => {
        const overdue = isCorrectiveActionOverdue(a);
        return (
          <span className={`text-xs ${overdue ? 'font-medium text-red-400' : 'text-muted'}`} title={new Date(a.dueDate).toLocaleDateString()}>
            {formatDueLabel(a.dueDate)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-8',
      render: (a) => (
        <Link
          to={`/corrective-actions/${a.id}`}
          className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-heading"
          aria-label={`Open ${a.referenceNumber}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Corrective Actions"
        description="Fixes assigned to responsible people, tracked from response through verification."
        action={
          canCreateCorrectiveAction(role) && (
            <Link to="/corrective-actions/new">
              <Button variant="primary">
                <Plus className="h-4 w-4" />
                New Corrective Action
              </Button>
            </Link>
          )
        }
      />

      <div className="mb-4 flex gap-1 rounded-md border border-border bg-surface p-1 sm:inline-flex">
        <button
          type="button"
          onClick={() => setView('register')}
          className={`flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            view === 'register' ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-body'
          }`}
        >
          <Table2 className="h-3.5 w-3.5" />
          Register
        </button>
        <button
          type="button"
          onClick={() => setView('dashboard')}
          className={`flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            view === 'dashboard' ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-body'
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </button>
      </div>

      {view === 'dashboard' ? (
        <CorrectiveActionDashboard />
      ) : (
      <SectionCard
        title="All Corrective Actions"
        description={loading ? 'Loading…' : `${meta?.total ?? actions.length} corrective action${(meta?.total ?? actions.length) === 1 ? '' : 's'}`}
        noPadding
      >
        <div className="border-b border-border p-4">
          <CorrectiveActionFilters value={filters} onChange={updateFilters} workplaceOptions={workplaceOptions} />
        </div>

        {loading ? (
          <CorrectiveActionListSkeleton />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load corrective actions"
            description={error}
            action={
              <Button variant="secondary" className="mt-2" onClick={() => setReloadToken((t) => t + 1)}>
                Retry
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable
                columns={columns}
                data={actions}
                getRowKey={(a) => a.id}
                getRowClassName={(a) => ROW_ACCENT[a.priority]}
                emptyMessage="No corrective actions match your filters."
              />
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {actions.length === 0 ? (
                <EmptyState icon={AlertTriangle} title="No matching corrective actions" description="No corrective actions match your filters." />
              ) : (
                actions.map((action) => <CorrectiveActionCard key={action.id} action={action} />)
              )}
            </div>
            {meta && <Pagination meta={meta} onPageChange={setPage} />}
          </>
        )}
      </SectionCard>
      )}
    </>
  );
}
