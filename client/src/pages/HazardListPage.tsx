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
import { HazardFilters, DEFAULT_HAZARD_FILTERS, type HazardFiltersState } from '../components/hazards/HazardFilters';
import { HazardQuickTabs, activeTabIdForFilters, filtersForTab } from '../components/hazards/HazardQuickTabs';
import { HazardCard } from '../components/hazards/HazardCard';
import { HazardListSkeleton } from '../components/hazards/HazardListSkeleton';
import { OverdueBadge } from '../components/OverdueBadge';
import { listHazards } from '../lib/hazardsApi';
import { listWorkplaces } from '../lib/workplacesApi';
import { formatRelativeTime } from '../lib/format';
import { formatOverdueBy, formatSlaExplanation, isHazardOverdue } from '../lib/hazardSla';
import type { PaginationMeta } from '../lib/pagination';
import type { HazardReport } from '../lib/hazardTypes';

const PAGE_SIZE = 20;

const ROW_ACCENT: Record<HazardReport['riskLevel'], string> = {
  Critical: 'border-l-2 border-l-red-500',
  High: 'border-l-2 border-l-orange-500',
  Medium: '',
  Low: '',
};

const DATE_RANGE_DAYS: Record<HazardFiltersState['dateRange'], number | null> = {
  all: null,
  today: 1,
  '7d': 7,
  '30d': 30,
};

export function HazardListPage() {
  const [searchParams] = useSearchParams();
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<HazardFiltersState>(() => ({
    ...DEFAULT_HAZARD_FILTERS,
    status: (searchParams.get('status') as HazardFiltersState['status']) ?? DEFAULT_HAZARD_FILTERS.status,
    risk: (searchParams.get('riskLevel') as HazardFiltersState['risk']) ?? DEFAULT_HAZARD_FILTERS.risk,
    overdueOnly: searchParams.get('overdue') === 'true',
  }));
  // A dashboard deep-link's "open only" (not closed/resolved) intent — separate from
  // `filters` since there's no single HazardStatus value meaning "open", and it should
  // drop out the moment the user touches any real filter control.
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

    const dateRangeDays = DATE_RANGE_DAYS[filters.dateRange];
    const reportedAfter = dateRangeDays ? new Date(Date.now() - dateRangeDays * 24 * 60 * 60 * 1000).toISOString() : undefined;

    listHazards({
      status: filters.status === 'all' ? undefined : filters.status,
      riskLevel: filters.risk === 'all' ? undefined : filters.risk,
      workplace: filters.workplace === 'all' ? undefined : filters.workplace,
      hazardCategory: filters.category === 'all' ? undefined : filters.category,
      assignedTo: filters.assigned === 'unassigned' ? 'unassigned' : undefined,
      overdue: filters.overdueOnly || undefined,
      openOnly: filters.status === 'all' ? openOnly : undefined,
      reportedAfter,
      search: debouncedSearch || undefined,
      sort: filters.sort,
      page,
      pageSize: PAGE_SIZE,
    })
      .then(({ items, meta: pageMeta }) => {
        if (cancelled) return;
        setHazards(items);
        setMeta(pageMeta ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load hazard reports.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.status,
    filters.risk,
    filters.workplace,
    filters.category,
    filters.assigned,
    filters.overdueOnly,
    filters.sort,
    openOnly,
    debouncedSearch,
    page,
    reloadToken,
  ]);

  function updateFilters(next: HazardFiltersState) {
    setFilters(next);
    setOpenOnly(false);
    setPage(1);
  }

  const activeTabId = activeTabIdForFilters(filters);

  const columns: DataTableColumn<HazardReport>[] = [
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (r) => (
        <Link to={`/hazards/${r.id}`} className="font-mono text-xs font-medium text-accent hover:underline">
          {r.referenceNumber}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Hazard',
      render: (r) => (
        <div>
          <p className="font-medium text-heading">{r.title}</p>
          <p className="text-xs text-muted">{r.location}</p>
        </div>
      ),
    },
    {
      key: 'workplace',
      header: 'Workplace',
      render: (r) => (
        <div>
          <p className="text-body">{r.workplace}</p>
          <p className="text-xs text-muted">{r.department}</p>
        </div>
      ),
    },
    { key: 'risk', header: 'Risk', render: (r) => <RiskBadge level={r.riskLevel} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'assignedTo',
      header: 'Assigned',
      render: (r) =>
        r.assignedTo ? (
          <span className="text-body">{r.assignedTo}</span>
        ) : (
          <span className="text-xs italic text-amber-400">Unassigned</span>
        ),
    },
    {
      key: 'reportedAt',
      header: 'Age',
      render: (r) => (
        <div className="space-y-1">
          <span className="block text-xs text-muted" title={new Date(r.reportedAt).toLocaleString()}>
            {formatRelativeTime(r.reportedAt)}
          </span>
          {isHazardOverdue(r) && (
            <OverdueBadge label={formatOverdueBy(r)} title={formatSlaExplanation(r)} />
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-8',
      render: (r) => (
        <Link
          to={`/hazards/${r.id}`}
          className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-heading"
          aria-label={`Open ${r.referenceNumber}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Hazard Reports"
        description="A live queue of reported hazards across all workplaces."
        action={
          <Link to="/hazards/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" />
              Report Hazard
            </Button>
          </Link>
        }
      />

      <div className="mb-4">
        <HazardQuickTabs
          activeTabId={activeTabId}
          onSelect={(tab) => updateFilters(filtersForTab(tab))}
          activeCount={meta?.total}
        />
      </div>

      <SectionCard
        title="All Hazard Reports"
        description={loading ? 'Loading…' : `${meta?.total ?? hazards.length} report${(meta?.total ?? hazards.length) === 1 ? '' : 's'}`}
        noPadding
      >
        <div className="border-b border-border p-4">
          <HazardFilters value={filters} onChange={updateFilters} workplaceOptions={workplaceOptions} />
        </div>

        {loading ? (
          <HazardListSkeleton />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load hazard reports"
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
                data={hazards}
                getRowKey={(r) => r.id}
                getRowClassName={(r) => ROW_ACCENT[r.riskLevel]}
                emptyMessage="No hazard reports match your filters."
              />
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {hazards.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="No matching reports"
                  description="No hazard reports match your filters."
                />
              ) : (
                hazards.map((hazard) => <HazardCard key={hazard.id} hazard={hazard} />)
              )}
            </div>
            {meta && <Pagination meta={meta} onPageChange={setPage} />}
          </>
        )}
      </SectionCard>
    </>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
