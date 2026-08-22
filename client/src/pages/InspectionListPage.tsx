import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, ClipboardList, Plus } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
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
import { computeOverallProgress } from '../lib/inspectionProgress';
import { formatDate } from '../lib/format';
import type { Inspection } from '../lib/inspectionTypes';
import type { InspectionTemplate } from '../lib/inspectionTemplateTypes';

export function InspectionListPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InspectionFiltersState>(DEFAULT_INSPECTION_FILTERS);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([listInspections(), listTemplates()])
      .then(([inspectionData, templateData]) => {
        if (cancelled) return;
        setInspections(inspectionData);
        setTemplates(templateData);
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
  }, [reloadToken]);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    const result = inspections.filter((inspection) => {
      if (filters.status !== 'all' && inspection.status !== filters.status) return false;
      if (filters.templateId !== 'all' && inspection.templateId !== filters.templateId) return false;
      if (filters.workplace !== 'all' && inspection.workplace !== filters.workplace) return false;
      if (filters.inspector !== 'all' && inspection.leadInspector !== filters.inspector) return false;
      if (search) {
        const haystack = `${inspection.referenceNumber} ${inspection.title} ${inspection.workplace}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (filters.sort === 'workplace') return a.workplace.localeCompare(b.workplace);
      if (filters.sort === 'status') return a.status.localeCompare(b.status);
      return filters.sort === 'newest'
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt);
    });

    return result;
  }, [inspections, filters]);

  const workplaceOptions = useMemo(
    () => Array.from(new Set(inspections.map((i) => i.workplace).filter(Boolean))).sort(),
    [inspections],
  );
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
        <InspectionQuickTabs inspections={inspections} activeTabId={activeTabId} onSelect={(tab) => setFilters(filtersForTab(tab))} />
      </div>

      <SectionCard
        title="Inspection Register"
        description={loading ? 'Loading…' : `${filtered.length} of ${inspections.length} inspections`}
        noPadding
      >
        <div className="border-b border-border p-4">
          <InspectionFilters
            value={filters}
            onChange={setFilters}
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
                data={filtered}
                getRowKey={(i) => i.id}
                emptyMessage="No inspections match your filters."
              />
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {filtered.length === 0 ? (
                <EmptyState icon={AlertTriangle} title="No matching inspections" description="No inspections match your filters." />
              ) : (
                filtered.map((inspection) => <InspectionCard key={inspection.id} inspection={inspection} />)
              )}
            </div>
          </>
        )}
      </SectionCard>
    </>
  );
}
