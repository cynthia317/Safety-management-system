import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Download, Wrench } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { StatCard } from '../StatCard';
import { DataTable, type DataTableColumn } from '../DataTable';
import { RiskBadge } from '../RiskBadge';
import { Button } from '../Button';
import { toCsv, downloadCsv } from '../../lib/csv';
import { isCorrectiveActionOverdue } from '../../lib/correctiveActionOverdue';
import { formatDate } from '../../lib/format';
import type { CorrectiveAction } from '../../lib/correctiveActionTypes';

function daysOverdue(dueDate: string): number {
  return Math.round((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
}

interface OverdueCorrectiveActionsReportProps {
  correctiveActions: CorrectiveAction[];
}

export function OverdueCorrectiveActionsReport({ correctiveActions }: OverdueCorrectiveActionsReportProps) {
  const overdue = useMemo(
    () => correctiveActions.filter(isCorrectiveActionOverdue).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [correctiveActions],
  );

  const criticalOrHighCount = overdue.filter((a) => a.priority === 'Critical' || a.priority === 'High').length;
  const oldest = overdue[0];

  function handleExport() {
    const csv = toCsv(overdue, [
      { header: 'Reference', value: (a) => a.referenceNumber },
      { header: 'Title', value: (a) => a.title },
      { header: 'Workplace', value: (a) => a.workplace },
      { header: 'Department', value: (a) => a.department },
      { header: 'Assigned To', value: (a) => a.assignedTo || 'Unassigned' },
      { header: 'Priority', value: (a) => a.priority },
      { header: 'Status', value: (a) => a.status },
      { header: 'Due Date', value: (a) => a.dueDate.slice(0, 10) },
      { header: 'Days Overdue', value: (a) => daysOverdue(a.dueDate) },
    ]);
    downloadCsv('overdue-corrective-actions.csv', csv);
  }

  const columns: DataTableColumn<CorrectiveAction>[] = [
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (a) => (
        <Link to={`/corrective-actions/${a.id}`} className="font-mono text-xs font-medium text-accent hover:underline">
          {a.referenceNumber}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Corrective Action',
      render: (a) => (
        <div>
          <p className="font-medium text-heading">{a.title}</p>
          <p className="text-xs text-muted">
            {a.workplace} / {a.department}
          </p>
        </div>
      ),
    },
    { key: 'assignedTo', header: 'Assigned To', render: (a) => <span className="text-body">{a.assignedTo || 'Unassigned'}</span> },
    { key: 'priority', header: 'Priority', render: (a) => <RiskBadge level={a.priority} /> },
    {
      key: 'dueDate',
      header: 'Due',
      render: (a) => (
        <div>
          <p className="text-xs text-body">{formatDate(a.dueDate)}</p>
          <p className="text-xs font-medium text-red-400">
            {daysOverdue(a.dueDate)} day{daysOverdue(a.dueDate) === 1 ? '' : 's'} overdue
          </p>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Overdue Actions" value={overdue.length} icon={Wrench} tone="danger" />
        <StatCard label="High / Critical Priority" value={criticalOrHighCount} icon={Wrench} tone="warning" />
        <StatCard label="Oldest Overdue" value={oldest ? `${daysOverdue(oldest.dueDate)} days` : 'None'} icon={Wrench} />
      </div>

      <SectionCard
        title="Overdue Corrective Actions"
        description="Actions past their due date that have not been closed."
        className="mt-4"
        action={
          <Button variant="secondary" onClick={handleExport} disabled={overdue.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
        noPadding
      >
        <DataTable columns={columns} data={overdue} getRowKey={(a) => a.id} emptyMessage="Nothing overdue — all corrective actions are on track." />
      </SectionCard>
    </>
  );
}
