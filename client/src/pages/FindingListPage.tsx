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
import {
  FindingFilters,
  DEFAULT_FINDING_FILTERS,
  type FindingFiltersState,
} from '../components/findings/FindingFilters';
import { FindingCard } from '../components/findings/FindingCard';
import { FindingListSkeleton } from '../components/findings/FindingListSkeleton';
import { listFindings } from '../lib/findingsApi';
import { formatDueLabel } from '../lib/format';
import { RISK_RANK } from '../lib/hazardOptions';
import type { Finding } from '../lib/findingTypes';

const ROW_ACCENT: Record<Finding['riskLevel'], string> = {
  Critical: 'border-l-2 border-l-red-500',
  High: 'border-l-2 border-l-orange-500',
  Medium: '',
  Low: '',
};

export function FindingListPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FindingFiltersState>(DEFAULT_FINDING_FILTERS);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listFindings()
      .then((data) => {
        if (cancelled) return;
        setFindings(data);
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
  }, [reloadToken]);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    const result = findings.filter((finding) => {
      if (filters.risk !== 'all' && finding.riskLevel !== filters.risk) return false;
      if (filters.status !== 'all' && finding.status !== filters.status) return false;
      if (filters.workplace !== 'all' && finding.workplace !== filters.workplace) return false;
      if (search) {
        const haystack = `${finding.referenceNumber} ${finding.title} ${finding.location}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (filters.sort === 'risk') {
        const rankDiff = RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel];
        if (rankDiff !== 0) return rankDiff;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (filters.sort === 'dueDate') {
        return a.dueDate.localeCompare(b.dueDate);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

    return result;
  }, [findings, filters]);

  const workplaceOptions = useMemo(
    () => Array.from(new Set(findings.map((f) => f.workplace).filter(Boolean))).sort(),
    [findings],
  );

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
        description={loading ? 'Loading…' : `${filtered.length} of ${findings.length} findings`}
        noPadding
      >
        <div className="border-b border-border p-4">
          <FindingFilters value={filters} onChange={setFilters} workplaceOptions={workplaceOptions} />
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
                data={filtered}
                getRowKey={(f) => f.id}
                getRowClassName={(f) => ROW_ACCENT[f.riskLevel]}
                emptyMessage="No findings match your filters."
              />
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="No matching findings"
                  description="No findings match your filters."
                />
              ) : (
                filtered.map((finding) => <FindingCard key={finding.id} finding={finding} />)
              )}
            </div>
          </>
        )}
      </SectionCard>
    </>
  );
}
