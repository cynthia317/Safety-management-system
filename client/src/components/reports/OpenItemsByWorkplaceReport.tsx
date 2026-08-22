import { useMemo } from 'react';
import { AlertTriangle, Building2, Download, FileSearch, Wrench } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { StatCard } from '../StatCard';
import { DataTable, type DataTableColumn } from '../DataTable';
import { Button } from '../Button';
import { toCsv, downloadCsv } from '../../lib/csv';
import type { HazardReport } from '../../lib/hazardTypes';
import type { Finding } from '../../lib/findingTypes';
import type { CorrectiveAction } from '../../lib/correctiveActionTypes';

interface WorkplaceRow {
  workplace: string;
  openHazards: number;
  openFindings: number;
  openCorrectiveActions: number;
  total: number;
}

interface OpenItemsByWorkplaceReportProps {
  hazards: HazardReport[];
  findings: Finding[];
  correctiveActions: CorrectiveAction[];
}

export function OpenItemsByWorkplaceReport({ hazards, findings, correctiveActions }: OpenItemsByWorkplaceReportProps) {
  const openHazards = useMemo(() => hazards.filter((h) => h.status !== 'Resolved' && h.status !== 'Closed'), [hazards]);
  const openFindings = useMemo(() => findings.filter((f) => f.status !== 'Closed'), [findings]);
  const openActions = useMemo(() => correctiveActions.filter((a) => a.status !== 'Closed'), [correctiveActions]);

  const rows = useMemo<WorkplaceRow[]>(() => {
    const workplaces = new Set([
      ...openHazards.map((h) => h.workplace),
      ...openFindings.map((f) => f.workplace),
      ...openActions.map((a) => a.workplace),
    ]);

    return [...workplaces]
      .filter(Boolean)
      .map((workplace) => {
        const openHazardsCount = openHazards.filter((h) => h.workplace === workplace).length;
        const openFindingsCount = openFindings.filter((f) => f.workplace === workplace).length;
        const openCorrectiveActionsCount = openActions.filter((a) => a.workplace === workplace).length;
        return {
          workplace,
          openHazards: openHazardsCount,
          openFindings: openFindingsCount,
          openCorrectiveActions: openCorrectiveActionsCount,
          total: openHazardsCount + openFindingsCount + openCorrectiveActionsCount,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [openHazards, openFindings, openActions]);

  function handleExport() {
    const csv = toCsv(rows, [
      { header: 'Workplace', value: (r) => r.workplace },
      { header: 'Open Hazards', value: (r) => r.openHazards },
      { header: 'Open Findings', value: (r) => r.openFindings },
      { header: 'Open Corrective Actions', value: (r) => r.openCorrectiveActions },
      { header: 'Total Open Items', value: (r) => r.total },
    ]);
    downloadCsv('open-items-by-workplace.csv', csv);
  }

  const columns: DataTableColumn<WorkplaceRow>[] = [
    { key: 'workplace', header: 'Workplace', render: (r) => <span className="font-medium text-heading">{r.workplace}</span> },
    { key: 'openHazards', header: 'Open Hazards', render: (r) => <span className="text-body">{r.openHazards}</span> },
    { key: 'openFindings', header: 'Open Findings', render: (r) => <span className="text-body">{r.openFindings}</span> },
    { key: 'openCorrectiveActions', header: 'Open Corrective Actions', render: (r) => <span className="text-body">{r.openCorrectiveActions}</span> },
    { key: 'total', header: 'Total', render: (r) => <span className="font-semibold text-heading">{r.total}</span> },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Open Hazards" value={openHazards.length} icon={AlertTriangle} tone="warning" />
        <StatCard label="Open Findings" value={openFindings.length} icon={FileSearch} />
        <StatCard label="Open Corrective Actions" value={openActions.length} icon={Wrench} tone="danger" />
        <StatCard label="Workplaces With Open Items" value={rows.length} icon={Building2} tone="accent" />
      </div>

      <SectionCard
        title="Open Items by Workplace"
        description="Hazards, findings, and corrective actions not yet closed, grouped by workplace."
        className="mt-4"
        action={
          <Button variant="secondary" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
        noPadding
      >
        <DataTable columns={columns} data={rows} getRowKey={(r) => r.workplace} emptyMessage="No open items — nothing to report." />
      </SectionCard>
    </>
  );
}
