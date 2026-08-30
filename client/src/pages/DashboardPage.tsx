import { useEffect, useState } from 'react';
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
import { getDashboardSummary } from '../lib/dashboardApi';
import type {
  DashboardCorrectiveActionSummary,
  DashboardFindingSummary,
  DashboardHazardSummary,
  DashboardInspectionSummary,
  DashboardSummary,
} from '../lib/dashboardApi';

const hazardColumns: DataTableColumn<DashboardHazardSummary>[] = [
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
  { key: 'risk', header: 'Risk', render: (r) => <RiskBadge level={r.riskLevel as 'Low' | 'Medium' | 'High' | 'Critical'} /> },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status as 'New' | 'Under Review' | 'Action Required' | 'Resolved' | 'Closed'} /> },
  {
    key: 'reportedAt',
    header: 'Reported',
    render: (r) => <span className="text-xs text-muted">{formatDate(r.reportedAt)}</span>,
  },
];

const findingColumns: DataTableColumn<DashboardFindingSummary>[] = [
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
  { key: 'risk', header: 'Risk', render: (r) => <RiskBadge level={r.riskLevel as 'Low' | 'Medium' | 'High' | 'Critical'} /> },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status as 'Open' | 'In Progress' | 'Awaiting Verification' | 'Closed'} /> },
  {
    key: 'dueDate',
    header: 'Due',
    render: (r) => <span className="text-xs text-muted">{formatDate(r.dueDate)}</span>,
  },
];

const correctiveActionColumns: DataTableColumn<DashboardCorrectiveActionSummary>[] = [
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
        <p className="text-xs text-muted">{r.assignedTo || 'Unassigned'}</p>
      </div>
    ),
  },
  { key: 'priority', header: 'Priority', render: (r) => <RiskBadge level={r.priority as 'Low' | 'Medium' | 'High' | 'Critical'} /> },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status as 'Assigned' | 'In Progress' | 'Awaiting Verification' | 'Verified' | 'Closed'} /> },
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

const inspectionColumns: DataTableColumn<DashboardInspectionSummary>[] = [
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
        <p className="font-medium text-heading">{r.title}</p>
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

/** Wraps a StatCard so it deep-links to the filtered list that produced its number —
 * visually identical to a plain StatCard, just clickable. */
function LinkedStatCard({ to, ...props }: { to: string } & Parameters<typeof StatCard>[0]) {
  return (
    <Link to={to} className="block rounded-md transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
      <StatCard {...props} />
    </Link>
  );
}

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    getDashboardSummary()
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load dashboard data.');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

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

  if (!summary) {
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
        <LinkedStatCard
          to="/hazards?openOnly=true"
          label="Open Hazards"
          value={summary.openHazards}
          hint={`${summary.reportedThisWeek} reported this week`}
          icon={AlertTriangle}
          tone="warning"
        />
        <LinkedStatCard
          to="/findings?openOnly=true"
          label="Open Findings"
          value={summary.openFindings}
          hint={`${summary.openFindingsHighOrCritical} rated high or critical`}
          icon={FileSearch}
          tone="default"
        />
        <LinkedStatCard
          to="/corrective-actions?overdue=true"
          label="Overdue Actions"
          value={summary.overdueActions}
          hint={summary.overdueActions > 0 ? `Oldest: ${summary.oldestOverdueDays} days overdue` : 'None overdue'}
          icon={Wrench}
          tone="danger"
        />
        <LinkedStatCard
          to="/hazards?openOnly=true&riskLevel=Critical"
          label="Critical Hazards"
          value={summary.criticalHazards}
          hint={`Across ${summary.criticalHazardWorkplaces} workplace${summary.criticalHazardWorkplaces === 1 ? '' : 's'}`}
          icon={ShieldAlert}
          tone="danger"
        />
        <LinkedStatCard
          to={`/inspections?from=${encodeURIComponent(summary.thisMonthStart)}&to=${encodeURIComponent(summary.thisMonthEnd)}`}
          label="Inspections This Month"
          value={summary.inspectionsThisMonth}
          hint={`${summary.inspectionsCompletedThisMonth} completed, ${summary.inspectionsUpcomingThisMonth} in progress`}
          icon={ClipboardCheck}
          tone="accent"
        />
        <StatCard
          label="Closure Rate"
          value={`${summary.closureRate}%`}
          hint="Corrective actions closed to date"
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Recent Hazard Reports" description="Latest hazards submitted across all sites" noPadding>
          {summary.recentHazards.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No hazard reports yet" description="Reports will appear here once submitted." />
          ) : (
            <DataTable columns={hazardColumns} data={summary.recentHazards} getRowKey={(r) => r.id} />
          )}
        </SectionCard>

        <SectionCard title="Critical Findings" description="High and critical risk findings requiring attention" noPadding>
          {summary.criticalFindings.length === 0 ? (
            <EmptyState icon={FileSearch} title="No critical findings open" description="High and critical findings will appear here." />
          ) : (
            <DataTable columns={findingColumns} data={summary.criticalFindings} getRowKey={(r) => r.id} />
          )}
        </SectionCard>

        <SectionCard title="Overdue Corrective Actions" description="Actions past their due date" noPadding>
          {summary.overdueCorrectiveActions.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing overdue" description="All corrective actions are on track." />
          ) : (
            <DataTable columns={correctiveActionColumns} data={summary.overdueCorrectiveActions} getRowKey={(r) => r.id} />
          )}
        </SectionCard>

        <SectionCard title="Inspections In Progress" description="Draft and in-progress inspections" noPadding>
          {summary.inProgressInspections.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="No inspections in progress" description="Draft and in-progress inspections will appear here." />
          ) : (
            <DataTable columns={inspectionColumns} data={summary.inProgressInspections} getRowKey={(r) => r.id} />
          )}
        </SectionCard>
      </div>
    </>
  );
}
