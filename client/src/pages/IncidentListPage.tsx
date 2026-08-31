import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Plus, Search, X } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import { Input } from '../components/form/Input';
import { Select } from '../components/form/Select';
import { listIncidents } from '../lib/incidentsApi';
import { listWorkplaces } from '../lib/workplacesApi';
import { useAuth } from '../lib/AuthContext';
import { formatDate } from '../lib/format';
import type { PaginationMeta } from '../lib/pagination';
import type { EventType, Incident, IncidentCategory, IncidentStatus } from '../lib/incidentTypes';

const PAGE_SIZE = 20;

const EVENT_TYPES: EventType[] = ['Incident', 'NearMiss'];
const CATEGORIES: IncidentCategory[] = [
  'Injury/Illness',
  'Property Damage',
  'Environmental',
  'Fire',
  'Equipment',
  'Vehicle',
  'Security',
  'Other',
];
const STATUSES: IncidentStatus[] = ['Reported', 'Under Investigation', 'Action Required', 'Resolved', 'Closed'];

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function IncidentListPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState<EventType | 'all'>((searchParams.get('eventType') as EventType) ?? 'all');
  const [category, setCategory] = useState<IncidentCategory | 'all'>('all');
  const [status, setStatus] = useState<IncidentStatus | 'all'>('all');
  const [department, setDepartment] = useState('');
  const [investigator, setInvestigator] = useState('');
  const [investigatorMine, setInvestigatorMine] = useState(false);
  // Admin/org-wide only — a scoped role's own workplace is already enforced server-side
  // regardless of this filter, so there's nothing useful for them to select here.
  const [workplace, setWorkplace] = useState('all');
  const [workplaceOptions, setWorkplaceOptions] = useState<string[]>([]);

  // Dashboard deep-link intent — separate from the manual filters above, and cleared the
  // moment the user touches any of them (same pattern as HazardListPage's `openOnly`).
  const [openOnly, setOpenOnly] = useState(searchParams.get('openOnly') === 'true');
  const [highPotential, setHighPotential] = useState(searchParams.get('highPotential') === 'true');
  const [dateFrom] = useState(searchParams.get('from') ?? undefined);
  const [dateTo] = useState(searchParams.get('to') ?? undefined);

  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedDepartment = useDebouncedValue(department, 300);
  const debouncedInvestigator = useDebouncedValue(investigator, 300);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    listWorkplaces()
      .then((workplaces) => {
        if (!cancelled) setWorkplaceOptions(workplaces.map((w) => w.name).sort());
      })
      .catch(() => {
        // Non-fatal — the workplace filter just stays empty if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listIncidents({
      eventType: eventType === 'all' ? undefined : eventType,
      category: category === 'all' ? undefined : category,
      status: status === 'all' ? undefined : status,
      department: debouncedDepartment || undefined,
      investigator: investigatorMine ? 'me' : debouncedInvestigator || undefined,
      workplace: isAdmin && workplace !== 'all' ? workplace : undefined,
      openOnly: status === 'all' ? openOnly : undefined,
      highPotential: highPotential || undefined,
      from: dateFrom,
      to: dateTo,
      search: debouncedSearch || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then(({ items, meta: pageMeta }) => {
        if (cancelled) return;
        setIncidents(items);
        setMeta(pageMeta ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load incidents.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    eventType,
    category,
    status,
    debouncedDepartment,
    debouncedInvestigator,
    investigatorMine,
    workplace,
    isAdmin,
    openOnly,
    highPotential,
    dateFrom,
    dateTo,
    debouncedSearch,
    page,
    reloadToken,
  ]);

  function resetPage() {
    setOpenOnly(false);
    setPage(1);
  }

  const hasActiveFilters =
    search !== '' ||
    eventType !== 'all' ||
    category !== 'all' ||
    status !== 'all' ||
    department !== '' ||
    investigator !== '' ||
    investigatorMine ||
    workplace !== 'all' ||
    highPotential;

  function clearFilters() {
    setSearch('');
    setEventType('all');
    setCategory('all');
    setStatus('all');
    setDepartment('');
    setInvestigator('');
    setInvestigatorMine(false);
    setWorkplace('all');
    setHighPotential(false);
    resetPage();
  }

  const columns: DataTableColumn<Incident>[] = [
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (i) => (
        <Link to={`/incidents/${i.id}`} className="font-mono text-xs font-medium text-accent hover:underline">
          {i.referenceNumber}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Event',
      render: (i) => (
        <div>
          <p className="font-medium text-heading">{i.title}</p>
          <p className="text-xs text-muted">
            {i.eventType === 'NearMiss' ? 'Near Miss' : 'Incident'} &middot; {i.category}
          </p>
        </div>
      ),
    },
    {
      key: 'workplace',
      header: 'Workplace',
      render: (i) => (
        <div>
          <p className="text-body">{i.workplace}</p>
          <p className="text-xs text-muted">{i.department}</p>
        </div>
      ),
    },
    { key: 'severity', header: 'Potential', render: (i) => <RiskBadge level={i.potentialSeverity} /> },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
    {
      key: 'investigator',
      header: 'Investigator',
      render: (i) =>
        i.leadInvestigator ? (
          <span className="text-body">{i.leadInvestigator}</span>
        ) : (
          <span className="text-xs italic text-amber-400">Unassigned</span>
        ),
    },
    { key: 'eventDate', header: 'Date', render: (i) => <span className="text-xs text-muted">{formatDate(i.eventDate)}</span> },
    {
      key: 'actions',
      header: '',
      className: 'w-8',
      render: (i) => (
        <Link
          to={`/incidents/${i.id}`}
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
        title="Incidents"
        description="Incidents and near misses across all workplaces."
        action={
          <Link to="/incidents/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" />
              Report Incident
            </Button>
          </Link>
        }
      />

      <SectionCard
        title="Incident Register"
        description={loading ? 'Loading…' : `${meta?.total ?? incidents.length} event${(meta?.total ?? incidents.length) === 1 ? '' : 's'}`}
        noPadding
      >
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Search by reference, title, or location…"
              className="pl-8"
              aria-label="Search incidents"
            />
          </div>
          <Select
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value as EventType | 'all');
              resetPage();
            }}
            aria-label="Filter by event type"
            className="w-auto min-w-[130px]"
          >
            <option value="all">Incident + Near Miss</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === 'NearMiss' ? 'Near Miss' : 'Incident'}
              </option>
            ))}
          </Select>
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as IncidentCategory | 'all');
              resetPage();
            }}
            aria-label="Filter by category"
            className="w-auto min-w-[150px]"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as IncidentStatus | 'all');
              resetPage();
            }}
            aria-label="Filter by status"
            className="w-auto min-w-[150px]"
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Input
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              resetPage();
            }}
            placeholder="Department"
            className="w-auto min-w-[130px]"
            aria-label="Filter by department"
          />
          <Input
            value={investigator}
            onChange={(e) => {
              setInvestigator(e.target.value);
              resetPage();
            }}
            placeholder="Investigator"
            disabled={investigatorMine}
            className="w-auto min-w-[130px]"
            aria-label="Filter by investigator"
          />
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-body">
            <input
              type="checkbox"
              checked={investigatorMine}
              onChange={(e) => {
                setInvestigatorMine(e.target.checked);
                resetPage();
              }}
              className="h-4 w-4 rounded border-border bg-surface text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            />
            Assigned to me
          </label>
          {isAdmin && (
            <Select
              value={workplace}
              onChange={(e) => {
                setWorkplace(e.target.value);
                resetPage();
              }}
              aria-label="Filter by workplace"
              className="w-auto min-w-[150px]"
            >
              <option value="all">All Workplaces</option>
              {workplaceOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </Select>
          )}
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-body">
            <input
              type="checkbox"
              checked={highPotential}
              onChange={(e) => {
                setHighPotential(e.target.checked);
                resetPage();
              }}
              className="h-4 w-4 rounded border-border bg-surface text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            />
            High potential only
          </label>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="px-2.5">
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>

        {loading ? (
          <LoadingState label="Loading incidents…" />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load incidents"
            description={error}
            action={
              <Button variant="secondary" className="mt-2" onClick={() => setReloadToken((t) => t + 1)}>
                Retry
              </Button>
            }
          />
        ) : (
          <>
            <DataTable columns={columns} data={incidents} getRowKey={(i) => i.id} emptyMessage="No incidents match your filters." />
            {meta && <Pagination meta={meta} onPageChange={setPage} />}
          </>
        )}
      </SectionCard>
    </>
  );
}
