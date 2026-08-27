import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { DataTable, type DataTableColumn } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import { Button } from '../Button';
import { toCsv, downloadCsv } from '../../lib/csv';
import { formatDate } from '../../lib/format';
import type { Inspection } from '../../lib/inspectionTypes';
import type { Finding } from '../../lib/findingTypes';

interface InspectionRegisterReportProps {
  inspections: Inspection[];
  findings: Finding[];
}

export function InspectionRegisterReport({ inspections, findings }: InspectionRegisterReportProps) {
  const findingsCountByInspection = useMemo(() => {
    const counts = new Map<string, number>();
    for (const finding of findings) {
      if (!finding.inspectionId) continue;
      counts.set(finding.inspectionId, (counts.get(finding.inspectionId) ?? 0) + 1);
    }
    return counts;
  }, [findings]);

  function handleExport() {
    const csv = toCsv(inspections, [
      { header: 'Reference', value: (i) => i.referenceNumber },
      { header: 'Template', value: (i) => i.templateName },
      { header: 'Workplace', value: (i) => i.workplace },
      { header: 'Inspector', value: (i) => i.leadInspector },
      { header: 'Status', value: (i) => i.status },
      { header: 'Scheduled Date', value: (i) => i.inspectionDate.slice(0, 10) },
      { header: 'Completed Date', value: (i) => (i.reviewedAt ? i.reviewedAt.slice(0, 10) : i.submittedAt ? i.submittedAt.slice(0, 10) : '') },
      { header: 'Findings Count', value: (i) => findingsCountByInspection.get(i.id) ?? 0 },
    ]);
    downloadCsv('inspection-register.csv', csv);
  }

  const columns: DataTableColumn<Inspection>[] = [
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (i) => (
        <Link to={`/inspections/${i.id}`} className="font-mono text-xs font-medium text-accent hover:underline">
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
          <p className="text-xs text-muted">
            {i.workplace} &middot; {i.templateName}
          </p>
        </div>
      ),
    },
    { key: 'leadInspector', header: 'Inspector', render: (i) => <span className="text-body">{i.leadInspector}</span> },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
    { key: 'inspectionDate', header: 'Scheduled', render: (i) => <span className="text-xs text-muted">{formatDate(i.inspectionDate)}</span> },
    {
      key: 'findingsCount',
      header: 'Findings',
      render: (i) => <span className="text-body">{findingsCountByInspection.get(i.id) ?? 0}</span>,
    },
  ];

  return (
    <SectionCard
      title="Inspection Register"
      description="Every inspection you have access to, for offline review or audit."
      action={
        <Button variant="secondary" onClick={handleExport} disabled={inspections.length === 0}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      }
      noPadding
    >
      <DataTable columns={columns} data={inspections} getRowKey={(i) => i.id} emptyMessage="No inspections to show." />
    </SectionCard>
  );
}
