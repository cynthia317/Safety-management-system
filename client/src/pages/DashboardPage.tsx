import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { SectionCard } from '../components/SectionCard';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { formatDate } from '../lib/format';
import { isCorrectiveActionOverdue } from '../lib/correctiveActionOverdue';
import { listHazards } from '../lib/hazardsApi';
import { listFindings } from '../lib/findingsApi';
import { listInspections } from '../lib/inspectionsApi';
import { listCorrectiveActions, getCorrectiveActionStats } from '../lib/correctiveActionsApi';
import type { HazardReport } from '../lib/hazardTypes';
import type { Finding } from '../lib/findingTypes';
import type { Inspection } from '../lib/inspectionTypes';
import type { CorrectiveAction, CorrectiveActionStats } from '../lib/correctiveActionTypes';

const hazardColumns: DataTableColumn<HazardReport>[] = [
  {
    key: 'referenceNumber',
    header: 'ID',
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
        <p className="text-xs text-muted">
          {r.workplace} / {r.location}
        </p>
      </div>
    ),
  },
  { key: 'risk', header: 'Risk', render: (r) => <RiskBadge level={r.riskLevel} /> },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  {
    key: 'reportedAt',
    header: 'Reported',
    render: (r) => <span className="text-xs text-muted">{formatDate(r.reportedAt)}</span>,
  },
];

const findingColumns: DataTableColumn<Finding>[] = [
  {
    key: 'referenceNumber',
    header: 'ID',
    render: (r) => (
      <Link to={`/findings/${r.id}`} className="font-mono text-xs font-medium text-accent hover:underline">
        {r.referenceNumber}
      </Link>
    ),
  },
  {
    key: 'title',
    header: 'Finding',
    render: (r) => (
      <div>
        <p className="font-medium text-heading">{r.title}</p>
        <p className="text-xs text-muted">
          {r.workplace} / {r.location}
        </p>
      </div>
    ),
  },
  { key: 'risk', header: 'Risk', render: (r) => <RiskBadge level={r.riskLevel} /> },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  {
    key: 'dueDate',
    header: 'Due',
    render: (r) => <span className="text-xs text-muted">{formatDate(r.dueDate)}</span>,
  },
];

const correctiveActionColumns: DataTableColumn<CorrectiveAction>[] = [
  {
    key: 'referenceNumber',
    header: 'ID',
    render: (r) => (
      <Link to={`/corrective-actions/${r.id}`} className="font-mono text-xs font-medium text-accent hover:underline">
        {r.referenceNumber}
      </Link>
    ),
  },
  {
    key: 'title',
    header: 'Corrective Action',
    render: (r) => (
      <div>
        <p className="font-medium text-heading">{r.title}</p>
        <p className="text-xs text-muted">
          {r.findingReferenceNumber ?? r.hazardReferenceNumber ?? r.sourceType} &middot; {r.assignedTo || 'Unassigned'}
        </p>
      </div>
    ),
  },
  { key: 'priority', header: 'Priority', render: (r) => <RiskBadge level={r.priority} /> },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  {
    key: 'dueDate',
    header: 'Due',
    render: (r) => {
      const daysOverdue = Math.round((Date.now() - new Date(r.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      return (
        <div>
          <p className="text-xs text-body">{formatDate(r.dueDate)}</p>
          <p className="text-xs font-medium text-red-400">{daysOverdue} day{daysOverdue === 1 ? '' : 's'} overdue</p>
        </div>
      );
    },
  },
];

const inspectionColumns: DataTableColumn<Inspection>[] = [
  {
    key: 'referenceNumber',
    header: 'ID',
    render: (r) => (
      <Link to={`/inspections/${r.id}`} className="font-mono text-xs font-medium text-accent hover:underline">
        {r.referenceNumber}
      </Link>
    ),
  },
  {
    key: 'templateName',
    header: 'Inspection',
    render: (r) => (
      <div>
        <p className="font-medium text-heading">{r.templateName}</p>
        <p className="text-xs text-muted">{r.workplace}</p>
      </div>
    ),
  },
  {
    key: 'leadInspector',
    header: 'Inspector',
    render: (r) => <span className="text-body">{r.leadInspector}</span>,
  },
  {
    key: 'inspectionDate',
    header: 'Scheduled',
    render: (r) => <span className="text-xs text-muted">{formatDate(r.inspectionDate)}</span>,
  },
];

export function DashboardPage() {
  const [hazards, setHazards] = useState<HazardReport[] | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [inspections, setInspections] = useState<Inspection[] | null>(null);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[] | null>(null);
  const [caStats, setCaStats] = useState<CorrectiveActionStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    Promise.all([listHazards(), listFindings(), listInspections(), listCorrectiveActions(), getCorrectiveActionStats()])
      .then(([h, f, i, c, stats]) => {
        if (cancelled) return;
        setHazards(h);
        setFindings(f);
        setInspections(i);
        setCorrectiveActions(c);
        setCaStats(stats);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load dashboard data.');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const loading = !hazards || !findings || !inspections || !correctiveActions || !caStats;

  const derived = useMemo(() => {
    if (!hazards || !findings || !inspections || !correctiveActions || !caStats) return null;

    const openHazards = hazards.filter((h) => h.status !== 'Resolved' && h.status !== 'Closed');
    const reportedThisWeek = hazards.filter(
      (h) => Date.now() - new Date(h.reportedAt).getTime() < 7 * 24 * 60 * 60 * 1000,
    ).length;

    const openFindings = findings.filter((f) => f.status !== 'Closed');
    const openFindingsHighOrCritical = openFindings.filter((f) => f.riskLevel === 'High' || f.riskLevel === 'Critical').length;

    const overdueActions = correctiveActions
      .filter((a) => isCorrectiveActionOverdue(a))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const oldestOverdue = overdueActions[0];
    const oldestOverdueDays = oldestOverdue
      ? Math.round((Date.now() - new Date(oldestOverdue.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const criticalOpenHazards = openHazards.filter((h) => h.riskLevel === 'Critical');
    const criticalOpenFindings = openFindings.filter((f) => f.riskLevel === 'Critical');
    const criticalWorkplaces = new Set([
      ...criticalOpenHazards.map((h) => h.workplace),
      ...criticalOpenFindings.map((f) => f.workplace),
    ]);
    const criticalRisksCount = criticalOpenHazards.length + criticalOpenFindings.length;

    const now = new Date();
    const inspectionsThisMonth = inspections.filter((i) => {
      const d = new Date(i.inspectionDate);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const completedThisMonth = inspectionsThisMonth.filter((i) => i.status === 'Reviewed' || i.status === 'Closed').length;
    const upcomingThisMonth = inspectionsThisMonth.length - completedThisMonth;

    const recentHazards = [...hazards].sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)).slice(0, 6);

    const criticalFindings = [...findings]
      .filter((f) => f.status !== 'Closed' && (f.riskLevel === 'High' || f.riskLevel === 'Critical'))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6);

    const inProgressInspections = [...inspections]
      .filter((i) => i.status === 'Draft' || i.status === 'In Progress')
      .sort((a, b) => a.inspectionDate.localeCompare(b.inspectionDate))
      .slice(0, 6);

    return {
      openHazardsCount: openHazards.length,
      reportedThisWeek,
      openFindingsCount: openFindings.length,
      openFindingsHighOrCritical,
      overdueActions: overdueActions.slice(0, 6),
      overdueActionsCount: overdueActions.length,
      oldestOverdueDays,
      criticalRisksCount,
      criticalWorkplacesCount: criticalWorkplaces.size,
      inspectionsThisMonthCount: inspectionsThisMonth.length,
      completedThisMonth,
      upcomingThisMonth,
      recentHazards,
      criticalFindings,
      inProgressInspections,
    };
  }, [hazards, findings, inspections, correctiveActions, caStats]);

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" description="Safety performance overview across all workplaces." />
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load dashboard"
          description={error}
          action={
            <Button variant="secondary" className="mt-2" onClick={() => setReloadToken((t) => t + 1)}>
              Retry
            </Button>
          }
        />
      </>
    );
  }

  if (loading || !derived) {
    return (
      <>
        <PageHeader title="Dashboard" description="Safety performance overview across all workplaces." />
        <LoadingState label="Loading dashboard…" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Safety performance overview across all workplaces."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Open Hazards"
          value={derived.openHazardsCount}
          hint={`${derived.reportedThisWeek} reported this week`}
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard
          label="Open Findings"
          value={derived.openFindingsCount}
          hint={`${derived.openFindingsHighOrCritical} rated high or critical`}
          icon={FileSearch}
          tone="default"
        />
        <StatCard
          label="Overdue Actions"
          value={derived.overdueActionsCount}
          hint={derived.overdueActionsCount > 0 ? `Oldest: ${derived.oldestOverdueDays} days overdue` : 'None overdue'}
          icon={Wrench}
          tone="danger"
        />
        <StatCard
          label="Critical Risks"
          value={derived.criticalRisksCount}
          hint={`Across ${derived.criticalWorkplacesCount} workplace${derived.criticalWorkplacesCount === 1 ? '' : 's'}`}
          icon={ShieldAlert}
          tone="danger"
        />
        <StatCard
          label="Inspections This Month"
          value={derived.inspectionsThisMonthCount}
          hint={`${derived.completedThisMonth} completed, ${derived.upcomingThisMonth} in progress`}
          icon={ClipboardCheck}
          tone="accent"
        />
        <StatCard
          label="Closure Rate"
          value={`${caStats.closureRate}%`}
          hint={`${caStats.byStatus.Closed} of ${caStats.totalActions} actions closed`}
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Recent Hazard Reports" description="Latest hazards submitted across all sites" noPadding>
          {derived.recentHazards.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No hazard reports yet" description="Reports will appear here once submitted." />
          ) : (
            <DataTable columns={hazardColumns} data={derived.recentHazards} getRowKey={(r) => r.id} />
          )}
        </SectionCard>

        <SectionCard title="Critical Findings" description="High and critical risk findings requiring attention" noPadding>
          {derived.criticalFindings.length === 0 ? (
            <EmptyState icon={FileSearch} title="No critical findings open" description="High and critical findings will appear here." />
          ) : (
            <DataTable columns={findingColumns} data={derived.criticalFindings} getRowKey={(r) => r.id} />
          )}
        </SectionCard>

        <SectionCard title="Overdue Corrective Actions" description="Actions past their due date" noPadding>
          {derived.overdueActions.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing overdue" description="All corrective actions are on track." />
          ) : (
            <DataTable columns={correctiveActionColumns} data={derived.overdueActions} getRowKey={(r) => r.id} />
          )}
        </SectionCard>

        <SectionCard title="Inspections In Progress" description="Draft and in-progress inspections" noPadding>
          {derived.inProgressInspections.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="No inspections in progress" description="Draft and in-progress inspections will appear here." />
          ) : (
            <DataTable columns={inspectionColumns} data={derived.inProgressInspections} getRowKey={(r) => r.id} />
          )}
        </SectionCard>
      </div>
    </>
  );
}
