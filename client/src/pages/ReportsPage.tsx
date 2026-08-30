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
import { HazardRegisterReport } from '../components/reports/HazardRegisterReport';
import { CorrectiveActionRegisterReport } from '../components/reports/CorrectiveActionRegisterReport';
import { InspectionRegisterReport } from '../components/reports/InspectionRegisterReport';
import { IncidentRegisterReport } from '../components/reports/IncidentRegisterReport';
import { listHazards } from '../lib/hazardsApi';
import { listFindings } from '../lib/findingsApi';
import { listInspections } from '../lib/inspectionsApi';
import { listCorrectiveActions } from '../lib/correctiveActionsApi';
import { listRiskAssessments } from '../lib/riskAssessmentsApi';
import { listIncidents } from '../lib/incidentsApi';
import type { HazardReport } from '../lib/hazardTypes';
import type { Finding } from '../lib/findingTypes';
import type { Inspection } from '../lib/inspectionTypes';
import type { CorrectiveAction } from '../lib/correctiveActionTypes';
import type { RiskAssessment } from '../lib/riskAssessmentTypes';
import type { Incident } from '../lib/incidentTypes';

const TABS: TabItem[] = [
  { id: 'open-items', label: 'Open Items by Workplace' },
  { id: 'overdue-actions', label: 'Overdue Corrective Actions' },
  { id: 'risk-summary', label: 'Risk Assessment Summary' },
  { id: 'hazard-register', label: 'Hazard Register' },
  { id: 'corrective-action-register', label: 'Corrective Action Register' },
  { id: 'inspection-register', label: 'Inspection Register' },
  { id: 'incident-register', label: 'Incident Register' },
];

export function ReportsPage() {
  const [hazards, setHazards] = useState<HazardReport[] | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [inspections, setInspections] = useState<Inspection[] | null>(null);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[] | null>(null);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[] | null>(null);
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('open-items');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    Promise.all([listHazards(), listFindings(), listInspections(), listCorrectiveActions(), listRiskAssessments(), listIncidents()])
      .then(([h, f, i, c, r, inc]) => {
        if (cancelled) return;
        setHazards(h.items);
        setFindings(f.items);
        setInspections(i.items);
        setCorrectiveActions(c.items);
        setRiskAssessments(r.items);
        setIncidents(inc.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load report data.');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const loading = !hazards || !findings || !inspections || !correctiveActions || !riskAssessments || !incidents;

  return (
    <>
      <PageHeader title="Reports" description="Canned reports and full-record registers across hazards, findings, inspections, corrective actions, and risk assessments." />

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
            {activeTab === 'hazard-register' && <HazardRegisterReport hazards={hazards} />}
            {activeTab === 'corrective-action-register' && <CorrectiveActionRegisterReport correctiveActions={correctiveActions} />}
            {activeTab === 'inspection-register' && <InspectionRegisterReport inspections={inspections} findings={findings} />}
            {activeTab === 'incident-register' && <IncidentRegisterReport incidents={incidents} />}
          </>
        )}
      </div>
    </>
  );
}
