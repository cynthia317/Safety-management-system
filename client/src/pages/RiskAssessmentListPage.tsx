import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { Button } from '../components/Button';
import { Input } from '../components/form/Input';
import { Select } from '../components/form/Select';
import { RiskMatrixBadge } from '../components/risk-assessments/RiskMatrixBadge';
import { listRiskAssessments } from '../lib/riskAssessmentsApi';
import { RISK_ASSESSMENT_STATUSES } from '../lib/riskAssessmentOptions';
import { formatDate } from '../lib/format';
import type { RiskAssessment, RiskAssessmentStatus } from '../lib/riskAssessmentTypes';
import type { RiskLevel } from '../lib/hazardTypes';

const RISK_LEVELS: RiskLevel[] = ['Critical', 'High', 'Medium', 'Low'];

export function RiskAssessmentListPage() {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RiskAssessmentStatus | 'all'>('all');
  const [riskLevel, setRiskLevel] = useState<RiskLevel | 'all'>('all');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listRiskAssessments()
      .then((data) => {
        if (cancelled) return;
        setAssessments(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load risk assessments.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assessments
      .filter((a) => {
        if (status !== 'all' && a.status !== status) return false;
        if (riskLevel !== 'all' && a.overallRiskLevel !== riskLevel) return false;
        if (term && !`${a.title} ${a.referenceNumber} ${a.workplace}`.toLowerCase().includes(term)) return false;
        return true;
      })
      .sort((a, b) => b.assessmentDate.localeCompare(a.assessmentDate));
  }, [assessments, search, status, riskLevel]);

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
          <p className="text-xs text-muted">{a.assessmentType}</p>
        </div>
      ),
    },
    {
      key: 'workplace',
      header: 'Workplace',
      render: (a) => (
        <div>
          <p className="text-body">{a.workplace}</p>
          <p className="text-xs text-muted">{a.department}</p>
        </div>
      ),
    },
    { key: 'date', header: 'Date', render: (a) => <span className="text-xs text-muted">{formatDate(a.assessmentDate)}</span> },
    { key: 'assessedBy', header: 'Assessed By', render: (a) => <span className="text-body">{a.assessedBy}</span> },
    {
      key: 'risk',
      header: 'Overall Risk',
      render: (a) => {
        const worst = a.items.reduce(
          (max, i) => Math.max(max, (i.residualRiskScore ?? i.riskScore)),
          0,
        );
        return <RiskMatrixBadge score={worst} level={a.overallRiskLevel} />;
      },
    },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'w-8',
      render: (a) => (
        <Link
          to={`/risk-assessments/${a.id}`}
          className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-heading"
          aria-label={`Open ${a.referenceNumber}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Risk Assessments"
        description="Likelihood x severity matrix scoring for hazards across the organisation."
        action={
          <Link to="/risk-assessments/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" />
              New Risk Assessment
            </Button>
          </Link>
        }
      />

      <SectionCard
        title="All Risk Assessments"
        description={loading ? 'Loading…' : `${filtered.length} of ${assessments.length} risk assessments`}
        noPadding
      >
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border p-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, reference, or workplace…"
            className="min-w-[220px] flex-1"
            aria-label="Search risk assessments"
          />
          <Select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value as RiskLevel | 'all')}
            aria-label="Filter by overall risk level"
            className="w-auto min-w-[160px]"
          >
            <option value="all">All Risk Levels</option>
            {RISK_LEVELS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as RiskAssessmentStatus | 'all')}
            aria-label="Filter by status"
            className="w-auto min-w-[140px]"
          >
            <option value="all">All Statuses</option>
            {RISK_ASSESSMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <LoadingState label="Loading risk assessments…" />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load risk assessments"
            description={error}
            action={
              <Button variant="secondary" className="mt-2" onClick={() => setReloadToken((t) => t + 1)}>
                Retry
              </Button>
            }
          />
        ) : (
          <DataTable columns={columns} data={filtered} getRowKey={(a) => a.id} emptyMessage="No risk assessments match your filters." />
        )}
      </SectionCard>
    </>
  );
}
