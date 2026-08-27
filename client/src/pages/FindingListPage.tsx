import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import {
  FindingFilters,
  DEFAULT_FINDING_FILTERS,
  type FindingFiltersState,
} from '../components/findings/FindingFilters';
import { FindingCard } from '../components/findings/FindingCard';
import { FindingListSkeleton } from '../components/findings/FindingListSkeleton';
import { listFindings } from '../lib/findingsApi';
import { listWorkplaces } from '../lib/workplacesApi';
import { formatDueLabel } from '../lib/format';
import type { PaginationMeta } from '../lib/pagination';
import type { Finding } from '../lib/findingTypes';

const PAGE_SIZE = 20;

const ROW_ACCENT: Record<Finding['riskLevel'], string> = {
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

export function FindingListPage() {
  const [searchParams] = useSearchParams();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FindingFiltersState>(() => ({
    ...DEFAULT_FINDING_FILTERS,
    status: (searchParams.get('status') as FindingFiltersState['status']) ?? DEFAULT_FINDING_FILTERS.status,
    risk: (searchParams.get('riskLevel') as FindingFiltersState['risk']) ?? DEFAULT_FINDING_FILTERS.risk,
  }));
  const [overdueOnly] = useState(searchParams.get('overdue') === 'true');
  const [openOnly, setOpenOnly] = useState(searchParams.get('openOnly') === 'true');
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

    listFindings({
      status: filters.status === 'all' ? undefined : filters.status,
      riskLevel: filters.risk === 'all' ? undefined : filters.risk,
      workplace: filters.workplace === 'all' ? undefined : filters.workplace,
      overdue: overdueOnly || undefined,
      openOnly: filters.status === 'all' ? openOnly : undefined,
      search: debouncedSearch || undefined,
      sort: filters.sort,
      page,
      pageSize: PAGE_SIZE,
    })
      .then(({ items, meta: pageMeta }) => {
        if (cancelled) return;
        setFindings(items);
        setMeta(pageMeta ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load findings.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.status, filters.risk, filters.workplace, filters.sort, overdueOnly, openOnly, debouncedSearch, page, reloadToken]);

  function updateFilters(next: FindingFiltersState) {
    setFilters(next);
    setOpenOnly(false);
    setPage(1);
  }

  const columns: DataTableColumn<Finding>[] = [
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (f) => (
        <Link to={`/findings/${f.id}`} className="font-mono text-xs font-medium text-accent hover:underline">
          {f.referenceNumber}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Finding',
      render: (f) => (
        <div>
          <p className="font-medium text-heading">{f.title}</p>
          <p className="text-xs text-muted">{f.location}</p>
        </div>
      ),
    },
    {
      key: 'workplace',
      header: 'Workplace',
      render: (f) => (
        <div>
          <p className="text-body">{f.workplace}</p>
          <p className="text-xs text-muted">{f.department}</p>
        </div>
      ),
    },
    { key: 'risk', header: 'Risk', render: (f) => <RiskBadge level={f.riskLevel} /> },
    { key: 'status', header: 'Status', render: (f) => <StatusBadge status={f.status} /> },
    {
      key: 'assignedTo',
      header: 'Assigned',
      render: (f) =>
        f.assignedTo ? (
          <span className="text-body">{f.assignedTo}</span>
        ) : (
          <span className="text-xs italic text-amber-400">Unassigned</span>
        ),
    },
    {
      key: 'dueDate',
      header: 'Due',
      render: (f) => {
        const overdue = f.status !== 'Closed' && new Date(f.dueDate).getTime() < Date.now();
        return (
          <span
            className={`text-xs ${overdue ? 'font-medium text-red-400' : 'text-muted'}`}
            title={new Date(f.dueDate).toLocaleDateString()}
          >
            {formatDueLabel(f.dueDate)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-8',
      render: (f) => (
        <Link
          to={`/findings/${f.id}`}
          className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-heading"
          aria-label={`Open ${f.referenceNumber}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Findings"
        description="Confirmed issues requiring correction, from hazard reviews and inspections."
        action={
          <Link to="/findings/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" />
              New Finding
            </Button>
          </Link>
        }
      />

      <SectionCard
        title="All Findings"
        description={loading ? 'Loading…' : `${meta?.total ?? findings.length} finding${(meta?.total ?? findings.length) === 1 ? '' : 's'}`}
        noPadding
      >
        <div className="border-b border-border p-4">
          <FindingFilters value={filters} onChange={updateFilters} workplaceOptions={workplaceOptions} />
        </div>

        {loading ? (
          <FindingListSkeleton />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load findings"
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
                data={findings}
                getRowKey={(f) => f.id}
                getRowClassName={(f) => ROW_ACCENT[f.riskLevel]}
                emptyMessage="No findings match your filters."
              />
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {findings.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="No matching findings"
                  description="No findings match your filters."
                />
              ) : (
                findings.map((finding) => <FindingCard key={finding.id} finding={finding} />)
              )}
            </div>
            {meta && <Pagination meta={meta} onPageChange={setPage} />}
          </>
        )}
      </SectionCard>
    </>
  );
}
