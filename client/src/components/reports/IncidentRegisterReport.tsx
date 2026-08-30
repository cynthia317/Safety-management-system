import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { DataTable, type DataTableColumn } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import { RiskBadge } from '../RiskBadge';
import { Button } from '../Button';
import { toCsv, downloadCsv } from '../../lib/csv';
import { formatDate } from '../../lib/format';
import type { Incident } from '../../lib/incidentTypes';

interface IncidentRegisterReportProps {
  incidents: Incident[];
}

export function IncidentRegisterReport({ incidents }: IncidentRegisterReportProps) {
  function handleExport() {
    // Deliberately excludes peopleInvolved, injury details, description, and investigation
    // narrative — this is a register export, not a place to bulk-export personal/medical
    // or investigative detail by default (Phase 6 decision).
    const csv = toCsv(incidents, [
      { header: 'Reference', value: (i) => i.referenceNumber },
      { header: 'Event Type', value: (i) => (i.eventType === 'NearMiss' ? 'Near Miss' : 'Incident') },
      { header: 'Category', value: (i) => i.category },
      { header: 'Title', value: (i) => i.title },
      { header: 'Workplace', value: (i) => i.workplace },
      { header: 'Location', value: (i) => i.location },
      { header: 'Event Date', value: (i) => i.eventDate.slice(0, 10) },
      { header: 'Actual Severity', value: (i) => i.actualSeverity },
      { header: 'Potential Severity', value: (i) => i.potentialSeverity },
      { header: 'Status', value: (i) => i.status },
      { header: 'Lead Investigator', value: (i) => i.leadInvestigator || 'Unassigned' },
      { header: 'Reported By', value: (i) => i.reportedBy },
      { header: 'Closed Date', value: (i) => (i.status === 'Closed' ? i.updatedAt.slice(0, 10) : '') },
    ]);
    downloadCsv('incident-register.csv', csv);
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
            {i.workplace} &middot; {i.eventType === 'NearMiss' ? 'Near Miss' : 'Incident'} &middot; {i.category}
          </p>
        </div>
      ),
    },
    { key: 'severity', header: 'Potential', render: (i) => <RiskBadge level={i.potentialSeverity} /> },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
    { key: 'investigator', header: 'Investigator', render: (i) => <span className="text-body">{i.leadInvestigator || 'Unassigned'}</span> },
    { key: 'eventDate', header: 'Event Date', render: (i) => <span className="text-xs text-muted">{formatDate(i.eventDate)}</span> },
  ];

  return (
    <SectionCard
      title="Incident Register"
      description="Every incident and near miss you have access to, for offline review or audit."
      action={
        <Button variant="secondary" onClick={handleExport} disabled={incidents.length === 0}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      }
      noPadding
    >
      <DataTable columns={columns} data={incidents} getRowKey={(i) => i.id} emptyMessage="No incidents to show." />
    </SectionCard>
  );
}
