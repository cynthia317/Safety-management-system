import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ChevronRight, ClipboardList, Plus } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import {
  InspectionFilters,
  DEFAULT_INSPECTION_FILTERS,
  type InspectionFiltersState,
} from '../components/inspections/InspectionFilters';
import {
  InspectionQuickTabs,
  activeTabIdForFilters,
  filtersForTab,
} from '../components/inspections/InspectionQuickTabs';
import { InspectionCard } from '../components/inspections/InspectionCard';
import { InspectionListSkeleton } from '../components/inspections/InspectionListSkeleton';
import { InspectionProgressBar } from '../components/inspections/InspectionProgressBar';
import { listInspections } from '../lib/inspectionsApi';
import { listTemplates } from '../lib/inspectionTemplatesApi';
import { listWorkplaces } from '../lib/workplacesApi';
import { computeOverallProgress } from '../lib/inspectionProgress';
import { formatDate } from '../lib/format';
import type { PaginationMeta } from '../lib/pagination';
import type { Inspection } from '../lib/inspectionTypes';
import type { InspectionTemplate } from '../lib/inspectionTemplateTypes';

const PAGE_SIZE = 20;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function InspectionListPage() {
  const [searchParams] = useSearchParams();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [workplaceOptions, setWorkplaceOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InspectionFiltersState>(() => ({
    ...DEFAULT_INSPECTION_FILTERS,
    status: (searchParams.get('status') as InspectionFiltersState['status']) ?? DEFAULT_INSPECTION_FILTERS.status,
  }));
  const [overdueOnly] = useState(searchParams.get('overdue') === 'true');
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch(() => {
        // Non-critical — the template filter dropdown just stays empty.
      });
    listWorkplaces()
      .then((workplaces) => setWorkplaceOptions(workplaces.map((w) => w.name).sort()))
      .catch(() => {
        // Non-critical — the workplace filter dropdown just stays empty.
      });
  }, []);

  const debouncedSearch = useDebouncedValue(filters.search, 300);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listInspections({
      status: filters.status === 'all' ? undefined : filters.status,
      workplace: filters.workplace === 'all' ? undefined : filters.workplace,
      assignedTo: filters.inspector === 'all' ? undefined : filters.inspector,
      overdue: overdueOnly || undefined,
      search: debouncedSearch || undefined,
      sort: filters.sort,
      page,
      pageSize: PAGE_SIZE,
    })
      .then(({ items, meta: pageMeta }) => {
        if (cancelled) return;
        // Template filtering has no server-side equivalent yet (no templateId query param) —
        // applied client-side over the current page only, which is an acceptable, documented
        // exception given how rarely it's combined with other filters in practice.
        const filtered = filters.templateId === 'all' ? items : items.filter((i) => i.templateId === filters.templateId);
        setInspections(filtered);
        setMeta(pageMeta ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load inspections.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.status, filters.workplace, filters.inspector, filters.templateId, filters.sort, overdueOnly, debouncedSearch, page, reloadToken]);

  function updateFilters(next: InspectionFiltersState) {
    setFilters(next);
    setPage(1);
  }

  const inspectorOptions = useMemo(
    () => Array.from(new Set(inspections.map((i) => i.leadInspector).filter(Boolean))).sort(),
    [inspections],
  );
  const templateOptions = useMemo(
    () => templates.map((t) => ({ id: t.id, name: t.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [templates],
  );

  const activeTabId = activeTabIdForFilters(filters);

  const columns: DataTableColumn<Inspection>[] = [
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (i) => (
        <Link
          to={i.status === 'Draft' || i.status === 'In Progress' ? `/inspections/${i.id}/conduct` : `/inspections/${i.id}`}
          className="font-mono text-xs font-medium text-accent hover:underline"
        >
          {i.referenceNumber}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Inspection',
      render: (i) => (
        <div>
          <p className="font-medium text-heading">{i.title}</p>
          <p className="text-xs text-muted">{i.templateName}</p>
        </div>
      ),
    },
    {
      key: 'workplace',
      header: 'Workplace',
      render: (i) => (
        <div>
          <p className="text-body">{i.workplace}</p>
          <p className="text-xs text-muted">{i.area}</p>
        </div>
      ),
    },
    {
      key: 'inspectionDate',
      header: 'Date',
      render: (i) => <span className="text-xs text-muted">{formatDate(i.inspectionDate)}</span>,
    },
    { key: 'leadInspector', header: 'Inspector', render: (i) => <span className="text-body">{i.leadInspector}</span> },
    {
      key: 'progress',
      header: 'Progress',
      render: (i) => <InspectionProgressBar progress={computeOverallProgress(i)} />,
    },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'w-8',
      render: (i) => (
        <Link
          to={i.status === 'Draft' || i.status === 'In Progress' ? `/inspections/${i.id}/conduct` : `/inspections/${i.id}`}
          className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-heading"
          aria-label={`Open ${i.referenceNumber}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Inspections"
        description="The inspection register — every scheduled, in-progress, and completed inspection."
        action={
          <div className="flex gap-2">
            <Link to="/inspection-templates">
              <Button variant="secondary">
                <ClipboardList className="h-4 w-4" />
                Manage Templates
              </Button>
            </Link>
            <Link to="/inspections/new">
              <Button variant="primary">
                <Plus className="h-4 w-4" />
                New Inspection
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-4">
        <InspectionQuickTabs activeTabId={activeTabId} onSelect={(tab) => updateFilters(filtersForTab(tab))} activeCount={meta?.total} />
      </div>

      <SectionCard
        title="Inspection Register"
        description={loading ? 'Loading…' : `${meta?.total ?? inspections.length} inspection${(meta?.total ?? inspections.length) === 1 ? '' : 's'}`}
        noPadding
      >
        <div className="border-b border-border p-4">
          <InspectionFilters
            value={filters}
            onChange={updateFilters}
            templateOptions={templateOptions}
            workplaceOptions={workplaceOptions}
            inspectorOptions={inspectorOptions}
          />
        </div>

        {loading ? (
          <InspectionListSkeleton />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load inspections"
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
                data={inspections}
                getRowKey={(i) => i.id}
                emptyMessage="No inspections match your filters."
              />
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {inspections.length === 0 ? (
                <EmptyState icon={AlertTriangle} title="No matching inspections" description="No inspections match your filters." />
              ) : (
                inspections.map((inspection) => <InspectionCard key={inspection.id} inspection={inspection} />)
              )}
            </div>
            {meta && <Pagination meta={meta} onPageChange={setPage} />}
          </>
        )}
      </SectionCard>
    </>
  );
}
