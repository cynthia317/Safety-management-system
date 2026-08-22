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
import { listTemplates } from '../lib/inspectionTemplatesApi';
import { TEMPLATE_CATEGORIES, TEMPLATE_STATUSES } from '../lib/inspectionTemplateOptions';
import type { InspectionTemplate, TemplateCategory, TemplateStatus } from '../lib/inspectionTemplateTypes';

export function InspectionTemplateListPage() {
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [status, setStatus] = useState<TemplateStatus | 'all'>('all');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listTemplates()
      .then((data) => {
        if (cancelled) return;
        setTemplates(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load inspection templates.');
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
    const term = search.trim().toLowerCase();
    return templates
      .filter((t) => {
        if (category !== 'all' && t.category !== category) return false;
        if (status !== 'all' && t.status !== status) return false;
        if (term && !`${t.name} ${t.code}`.toLowerCase().includes(term)) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [templates, search, category, status]);

  const columns: DataTableColumn<InspectionTemplate>[] = [
    {
      key: 'name',
      header: 'Template',
      render: (t) => (
        <div>
          <Link to={`/inspection-templates/${t.id}`} className="text-sm font-medium text-heading hover:text-accent">
            {t.name}
          </Link>
          <p className="font-mono text-xs text-muted">{t.code}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (t) => <span className="text-body">{t.category}</span> },
    {
      key: 'size',
      header: 'Size',
      render: (t) => (
        <span className="text-xs text-muted">
          {t.sections.length} sections &middot; {t.sections.reduce((sum, s) => sum + s.questions.length, 0)} questions
        </span>
      ),
    },
    { key: 'version', header: 'Version', render: (t) => <span className="text-xs text-muted">v{t.version}</span> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'w-8',
      render: (t) => (
        <Link
          to={`/inspection-templates/${t.id}`}
          className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-heading"
          aria-label={`Open ${t.name}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Inspection Templates"
        description="Configurable checklists used to create inspections for any workplace."
        action={
          <Link to="/inspection-templates/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </Link>
        }
      />

      <SectionCard
        title="All Templates"
        description={loading ? 'Loading…' : `${filtered.length} of ${templates.length} templates`}
        noPadding
      >
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border p-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code…"
            className="min-w-[220px] flex-1"
            aria-label="Search templates"
          />
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as TemplateCategory | 'all')}
            aria-label="Filter by category"
            className="w-auto min-w-[180px]"
          >
            <option value="all">All Categories</option>
            {TEMPLATE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as TemplateStatus | 'all')}
            aria-label="Filter by status"
            className="w-auto min-w-[140px]"
          >
            <option value="all">All Statuses</option>
            {TEMPLATE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <LoadingState label="Loading templates…" />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load templates"
            description={error}
            action={
              <Button variant="secondary" className="mt-2" onClick={() => setReloadToken((t) => t + 1)}>
                Retry
              </Button>
            }
          />
        ) : (
          <DataTable columns={columns} data={filtered} getRowKey={(t) => t.id} emptyMessage="No templates match your filters." />
        )}
      </SectionCard>
    </>
  );
}
