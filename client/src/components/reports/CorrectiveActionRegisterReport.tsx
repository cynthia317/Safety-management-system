import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { DataTable, type DataTableColumn } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import { RiskBadge } from '../RiskBadge';
import { Button } from '../Button';
import { toCsv, downloadCsv } from '../../lib/csv';
import { isCorrectiveActionOverdue } from '../../lib/correctiveActionOverdue';
import { formatDate } from '../../lib/format';
import type { CorrectiveAction } from '../../lib/correctiveActionTypes';

interface CorrectiveActionRegisterReportProps {
  correctiveActions: CorrectiveAction[];
}

export function CorrectiveActionRegisterReport({ correctiveActions }: CorrectiveActionRegisterReportProps) {
  function handleExport() {
    const csv = toCsv(correctiveActions, [
      { header: 'Reference', value: (a) => a.referenceNumber },
      { header: 'Title', value: (a) => a.title },
      { header: 'Workplace', value: (a) => a.workplace },
      { header: 'Source', value: (a) => a.sourceType },
      { header: 'Assigned To', value: (a) => a.assignedTo || 'Unassigned' },
      { header: 'Priority', value: (a) => a.priority },
      { header: 'Due Date', value: (a) => a.dueDate.slice(0, 10) },
      { header: 'Status', value: (a) => a.status },
      { header: 'Overdue', value: (a) => (isCorrectiveActionOverdue(a) ? 'Yes' : 'No') },
      { header: 'Closed Date', value: (a) => (a.closedAt ? a.closedAt.slice(0, 10) : '') },
    ]);
    downloadCsv('corrective-action-register.csv', csv);
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
            {a.workplace} &middot; {a.sourceType}
          </p>
        </div>
      ),
    },
    { key: 'assignedTo', header: 'Assigned To', render: (a) => <span className="text-body">{a.assignedTo || 'Unassigned'}</span> },
    { key: 'priority', header: 'Priority', render: (a) => <RiskBadge level={a.priority} /> },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { key: 'dueDate', header: 'Due', render: (a) => <span className="text-xs text-muted">{formatDate(a.dueDate)}</span> },
    {
      key: 'closedAt',
      header: 'Closed',
      render: (a) => <span className="text-xs text-muted">{a.closedAt ? formatDate(a.closedAt) : '—'}</span>,
    },
  ];

  return (
    <SectionCard
      title="Corrective Action Register"
      description="Every corrective action you have access to, for offline review or audit."
      action={
        <Button variant="secondary" onClick={handleExport} disabled={correctiveActions.length === 0}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      }
      noPadding
    >
      <DataTable columns={columns} data={correctiveActions} getRowKey={(a) => a.id} emptyMessage="No corrective actions to show." />
    </SectionCard>
  );
}
