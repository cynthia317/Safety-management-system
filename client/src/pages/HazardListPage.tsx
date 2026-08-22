import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { HazardFilters, DEFAULT_HAZARD_FILTERS, type HazardFiltersState } from '../components/hazards/HazardFilters';
import { HazardQuickTabs, activeTabIdForFilters, filtersForTab } from '../components/hazards/HazardQuickTabs';
import { HazardCard } from '../components/hazards/HazardCard';
import { HazardListSkeleton } from '../components/hazards/HazardListSkeleton';
import { OverdueBadge } from '../components/OverdueBadge';
import { listHazards } from '../lib/hazardsApi';
import { formatRelativeTime } from '../lib/format';
import { RISK_RANK } from '../lib/hazardOptions';
import { formatOverdueBy, formatSlaExplanation, isHazardOverdue } from '../lib/hazardSla';
import type { HazardReport } from '../lib/hazardTypes';

const ROW_ACCENT: Record<HazardReport['riskLevel'], string> = {
  Critical: 'border-l-2 border-l-red-500',
  High: 'border-l-2 border-l-orange-500',
  Medium: '',
  Low: '',
};

function withinDateRange(reportedAt: string, range: HazardFiltersState['dateRange']): boolean {
  if (range === 'all') return true;
  const reportedTime = new Date(reportedAt).getTime();
  const now = Date.now();
  const days = range === 'today' ? 1 : range === '7d' ? 7 : 30;
  return now - reportedTime <= days * 24 * 60 * 60 * 1000;
}

export function HazardListPage() {
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<HazardFiltersState>(DEFAULT_HAZARD_FILTERS);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listHazards()
      .then((data) => {
        if (cancelled) return;
        setHazards(data);
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
  }, [reloadToken]);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    const result = hazards.filter((hazard) => {
      if (filters.risk !== 'all' && hazard.riskLevel !== filters.risk) return false;
      if (filters.status !== 'all' && hazard.status !== filters.status) return false;
      if (filters.workplace !== 'all' && hazard.workplace !== filters.workplace) return false;
      if (filters.category !== 'all' && hazard.hazardCategory !== filters.category) return false;
      if (filters.assigned === 'unassigned' && hazard.assignedTo !== '') return false;
      if (filters.overdueOnly && !isHazardOverdue(hazard)) return false;
      if (!withinDateRange(hazard.reportedAt, filters.dateRange)) return false;
      if (search) {
        const haystack = `${hazard.referenceNumber} ${hazard.title} ${hazard.location}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (filters.sort === 'risk') {
        const rankDiff = RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel];
        if (rankDiff !== 0) return rankDiff;
        return b.reportedAt.localeCompare(a.reportedAt);
      }
      return filters.sort === 'newest'
        ? b.reportedAt.localeCompare(a.reportedAt)
        : a.reportedAt.localeCompare(b.reportedAt);
    });

    return result;
  }, [hazards, filters]);

  const workplaceOptions = useMemo(
    () => Array.from(new Set(hazards.map((h) => h.workplace).filter(Boolean))).sort(),
    [hazards],
  );

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
          hazards={hazards}
          activeTabId={activeTabId}
          onSelect={(tab) => setFilters(filtersForTab(tab))}
        />
      </div>

      <SectionCard
        title="All Hazard Reports"
        description={loading ? 'Loading…' : `${filtered.length} of ${hazards.length} reports`}
        noPadding
      >
        <div className="border-b border-border p-4">
          <HazardFilters value={filters} onChange={setFilters} workplaceOptions={workplaceOptions} />
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
                data={filtered}
                getRowKey={(r) => r.id}
                getRowClassName={(r) => ROW_ACCENT[r.riskLevel]}
                emptyMessage="No hazard reports match your filters."
              />
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="No matching reports"
                  description="No hazard reports match your filters."
                />
              ) : (
                filtered.map((hazard) => <HazardCard key={hazard.id} hazard={hazard} />)
              )}
            </div>
          </>
        )}
      </SectionCard>
    </>
  );
}
