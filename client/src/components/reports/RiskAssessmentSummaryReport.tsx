import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { DataTable, type DataTableColumn } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import { Button } from '../Button';
import { RISK_LEVEL_STYLES } from '../../lib/riskMatrix';
import { toCsv, downloadCsv } from '../../lib/csv';
import { formatDate, formatDueLabel } from '../../lib/format';
import type { RiskAssessment, RiskAssessmentStatus } from '../../lib/riskAssessmentTypes';
import type { RiskLevel } from '../../lib/hazardTypes';

const RISK_LEVELS: RiskLevel[] = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES: RiskAssessmentStatus[] = ['Draft', 'Under Review', 'Approved', 'Closed'];

interface RiskAssessmentSummaryReportProps {
  riskAssessments: RiskAssessment[];
}

export function RiskAssessmentSummaryReport({ riskAssessments }: RiskAssessmentSummaryReportProps) {
  const byLevel = useMemo(() => {
    const counts: Record<RiskLevel, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const a of riskAssessments) counts[a.overallRiskLevel] += 1;
    return counts;
  }, [riskAssessments]);

  const byStatus = useMemo(() => {
    const counts: Record<RiskAssessmentStatus, number> = { Draft: 0, 'Under Review': 0, Approved: 0, Closed: 0 };
    for (const a of riskAssessments) counts[a.status] += 1;
    return counts;
  }, [riskAssessments]);

  const upcomingReviews = useMemo(
    () =>
      riskAssessments
        .filter((a) => a.status !== 'Closed' && a.nextReviewDate)
        .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate)),
    [riskAssessments],
  );

  function handleExport() {
    const csv = toCsv(upcomingReviews, [
      { header: 'Reference', value: (a) => a.referenceNumber },
      { header: 'Title', value: (a) => a.title },
      { header: 'Workplace', value: (a) => a.workplace },
      { header: 'Department', value: (a) => a.department },
      { header: 'Status', value: (a) => a.status },
      { header: 'Overall Risk Level', value: (a) => a.overallRiskLevel },
      { header: 'Next Review Date', value: (a) => a.nextReviewDate.slice(0, 10) },
    ]);
    downloadCsv('risk-assessment-reviews.csv', csv);
  }

  const columns: DataTableColumn<RiskAssessment>[] = [
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (a) => (
        <Link to={`/risk-assessments/${a.id}`} className="font-mono text-xs font-medium text-accent hover:underline">
          {a.referenceNumber}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Assessment',
      render: (a) => (
        <div>
          <p className="font-medium text-heading">{a.title}</p>
          <p className="text-xs text-muted">
            {a.workplace} / {a.department}
          </p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'nextReviewDate',
      header: 'Next Review',
      render: (a) => (
        <div>
          <p className="text-xs text-body">{formatDate(a.nextReviewDate)}</p>
          <p className="text-xs text-muted">{formatDueLabel(a.nextReviewDate)}</p>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SectionCard title="By Overall Risk Level">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {RISK_LEVELS.map((level) => (
              <div key={level} className={`rounded-md border p-3 text-center ${RISK_LEVEL_STYLES[level]}`}>
                <p className="text-2xl font-semibold">{byLevel[level]}</p>
                <p className="text-xs font-medium uppercase tracking-wide">{level}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="By Status">
          <dl className="grid grid-cols-2 gap-3">
            {STATUSES.map((status) => (
              <div key={status} className="rounded-md border border-border bg-canvas-raised p-3">
                <dt className="text-xs text-muted">{status}</dt>
                <dd className="mt-0.5 text-xl font-semibold text-heading">{byStatus[status]}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>

      <SectionCard
        title="Upcoming Reviews"
        description="Active risk assessments with a next review date, soonest first."
        className="mt-4"
        action={
          <Button variant="secondary" onClick={handleExport} disabled={upcomingReviews.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
        noPadding
      >
        <DataTable
          columns={columns}
          data={upcomingReviews}
          getRowKey={(a) => a.id}
          emptyMessage="No active risk assessments have a next review date set."
        />
      </SectionCard>
    </>
  );
}
