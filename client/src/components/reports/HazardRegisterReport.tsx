import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { DataTable, type DataTableColumn } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import { RiskBadge } from '../RiskBadge';
import { Button } from '../Button';
import { toCsv, downloadCsv } from '../../lib/csv';
import { formatDate } from '../../lib/format';
import type { HazardReport } from '../../lib/hazardTypes';

interface HazardRegisterReportProps {
  hazards: HazardReport[];
}

export function HazardRegisterReport({ hazards }: HazardRegisterReportProps) {
  function handleExport() {
    const csv = toCsv(hazards, [
      { header: 'Reference', value: (h) => h.referenceNumber },
      { header: 'Title', value: (h) => h.title },
      { header: 'Description', value: (h) => h.description },
      { header: 'Workplace', value: (h) => h.workplace },
      { header: 'Category', value: (h) => h.hazardCategory },
      { header: 'Risk Level', value: (h) => h.riskLevel },
      { header: 'Status', value: (h) => h.status },
      { header: 'Reported Date', value: (h) => h.reportedAt.slice(0, 10) },
      { header: 'Reported By', value: (h) => h.reportedBy },
      { header: 'Assigned To', value: (h) => h.assignedTo || 'Unassigned' },
    ]);
    downloadCsv('hazard-register.csv', csv);
  }

  const columns: DataTableColumn<HazardReport>[] = [
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (h) => (
        <Link to={`/hazards/${h.id}`} className="font-mono text-xs font-medium text-accent hover:underline">
          {h.referenceNumber}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Hazard',
      render: (h) => (
        <div>
          <p className="font-medium text-heading">{h.title}</p>
          <p className="text-xs text-muted">
            {h.workplace} &middot; {h.hazardCategory}
          </p>
        </div>
      ),
    },
    { key: 'risk', header: 'Risk', render: (h) => <RiskBadge level={h.riskLevel} /> },
    { key: 'status', header: 'Status', render: (h) => <StatusBadge status={h.status} /> },
    { key: 'reportedBy', header: 'Reported By', render: (h) => <span className="text-body">{h.reportedBy}</span> },
    { key: 'reportedAt', header: 'Reported', render: (h) => <span className="text-xs text-muted">{formatDate(h.reportedAt)}</span> },
  ];

  return (
    <SectionCard
      title="Hazard Register"
      description="Every hazard report you have access to, for offline review or audit."
      action={
        <Button variant="secondary" onClick={handleExport} disabled={hazards.length === 0}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      }
      noPadding
    >
      <DataTable columns={columns} data={hazards} getRowKey={(h) => h.id} emptyMessage="No hazard reports to show." />
    </SectionCard>
  );
}
