import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { Button } from '../components/Button';
import { Tabs, type TabItem } from '../components/Tabs';
import { OpenItemsByWorkplaceReport } from '../components/reports/OpenItemsByWorkplaceReport';
import { OverdueCorrectiveActionsReport } from '../components/reports/OverdueCorrectiveActionsReport';
import { RiskAssessmentSummaryReport } from '../components/reports/RiskAssessmentSummaryReport';
import { listHazards } from '../lib/hazardsApi';
import { listFindings } from '../lib/findingsApi';
import { listCorrectiveActions } from '../lib/correctiveActionsApi';
import { listRiskAssessments } from '../lib/riskAssessmentsApi';
import type { HazardReport } from '../lib/hazardTypes';
import type { Finding } from '../lib/findingTypes';
import type { CorrectiveAction } from '../lib/correctiveActionTypes';
import type { RiskAssessment } from '../lib/riskAssessmentTypes';

const TABS: TabItem[] = [
  { id: 'open-items', label: 'Open Items by Workplace' },
  { id: 'overdue-actions', label: 'Overdue Corrective Actions' },
  { id: 'risk-summary', label: 'Risk Assessment Summary' },
];

export function ReportsPage() {
  const [hazards, setHazards] = useState<HazardReport[] | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[] | null>(null);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('open-items');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    Promise.all([listHazards(), listFindings(), listCorrectiveActions(), listRiskAssessments()])
      .then(([h, f, c, r]) => {
        if (cancelled) return;
        setHazards(h);
        setFindings(f);
        setCorrectiveActions(c);
        setRiskAssessments(r);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load report data.');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const loading = !hazards || !findings || !correctiveActions || !riskAssessments;

  return (
    <>
      <PageHeader title="Reports" description="Canned reports across hazards, findings, corrective actions, and risk assessments." />

      <Tabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

      <div className="mt-4">
        {error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load report data"
            description={error}
            action={
              <Button variant="secondary" className="mt-2" onClick={() => setReloadToken((t) => t + 1)}>
                Retry
              </Button>
            }
          />
        ) : loading ? (
          <LoadingState label="Loading report data…" />
        ) : (
          <>
            {activeTab === 'open-items' && (
              <OpenItemsByWorkplaceReport hazards={hazards} findings={findings} correctiveActions={correctiveActions} />
            )}
            {activeTab === 'overdue-actions' && <OverdueCorrectiveActionsReport correctiveActions={correctiveActions} />}
            {activeTab === 'risk-summary' && <RiskAssessmentSummaryReport riskAssessments={riskAssessments} />}
          </>
        )}
      </div>
    </>
  );
}
