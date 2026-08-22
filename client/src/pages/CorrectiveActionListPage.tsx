import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, LayoutDashboard, Plus, Table2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import {
  CorrectiveActionFilters,
  DEFAULT_CORRECTIVE_ACTION_FILTERS,
  type CorrectiveActionFiltersState,
} from '../components/corrective-actions/CorrectiveActionFilters';
import { CorrectiveActionCard } from '../components/corrective-actions/CorrectiveActionCard';
import { CorrectiveActionListSkeleton } from '../components/corrective-actions/CorrectiveActionListSkeleton';
import { CorrectiveActionDashboard } from '../components/corrective-actions/CorrectiveActionDashboard';
import { listCorrectiveActions } from '../lib/correctiveActionsApi';
import { formatDueLabel } from '../lib/format';
import { isCorrectiveActionOverdue } from '../lib/correctiveActionOverdue';
import { RISK_RANK } from '../lib/hazardOptions';
import { useAuth } from '../lib/AuthContext';
import { canCreateCorrectiveAction } from '../lib/roles';
import type { CorrectiveAction } from '../lib/correctiveActionTypes';

const ROW_ACCENT: Record<CorrectiveAction['priority'], string> = {
  Critical: 'border-l-2 border-l-red-500',
  High: 'border-l-2 border-l-orange-500',
  Medium: '',
  Low: '',
};

export function CorrectiveActionListPage() {
  const { user } = useAuth();
  const role = user!.role;
  const [view, setView] = useState<'register' | 'dashboard'>('register');
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CorrectiveActionFiltersState>(DEFAULT_CORRECTIVE_ACTION_FILTERS);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listCorrectiveActions()
      .then((data) => {
        if (cancelled) return;
        setActions(data);
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
  }, [reloadToken]);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    const result = actions.filter((action) => {
      if (filters.priority !== 'all' && action.priority !== filters.priority) return false;
      if (filters.status !== 'all' && action.status !== filters.status) return false;
      if (filters.workplace !== 'all' && action.workplace !== filters.workplace) return false;
      if (search) {
        const haystack = `${action.referenceNumber} ${action.title} ${action.location}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (filters.sort === 'priority') {
        const rankDiff = RISK_RANK[b.priority] - RISK_RANK[a.priority];
        if (rankDiff !== 0) return rankDiff;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (filters.sort === 'dueDate') return a.dueDate.localeCompare(b.dueDate);
      return b.createdAt.localeCompare(a.createdAt);
    });

    return result;
  }, [actions, filters]);

  const workplaceOptions = useMemo(
    () => Array.from(new Set(actions.map((a) => a.workplace).filter(Boolean))).sort(),
    [actions],
  );

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
        description={loading ? 'Loading…' : `${filtered.length} of ${actions.length} corrective actions`}
        noPadding
      >
        <div className="border-b border-border p-4">
          <CorrectiveActionFilters value={filters} onChange={setFilters} workplaceOptions={workplaceOptions} />
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
                data={filtered}
                getRowKey={(a) => a.id}
                getRowClassName={(a) => ROW_ACCENT[a.priority]}
                emptyMessage="No corrective actions match your filters."
              />
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {filtered.length === 0 ? (
                <EmptyState icon={AlertTriangle} title="No matching corrective actions" description="No corrective actions match your filters." />
              ) : (
                filtered.map((action) => <CorrectiveActionCard key={action.id} action={action} />)
              )}
            </div>
          </>
        )}
      </SectionCard>
      )}
    </>
  );
}
