export interface DashboardHazardSummary {
  id: string;
  referenceNumber: string;
  title: string;
  workplace: string;
  location: string;
  riskLevel: string;
  status: string;
  reportedAt: string;
}

export interface DashboardFindingSummary {
  id: string;
  referenceNumber: string;
  title: string;
  workplace: string;
  location: string;
  riskLevel: string;
  status: string;
  dueDate: string;
}

export interface DashboardCorrectiveActionSummary {
  id: string;
  referenceNumber: string;
  title: string;
  workplace: string;
  assignedTo: string;
  priority: string;
  status: string;
  dueDate: string;
}

export interface DashboardInspectionSummary {
  id: string;
  referenceNumber: string;
  title: string;
  workplace: string;
  leadInspector: string;
  inspectionDate: string;
  status: string;
  templateName: string;
}

// A compact summary purpose-built for the dashboard's own cards/sections — never the full
// entity shape, and never a large unbounded list, so the payload stays small regardless of
// how large the underlying tables grow. Every count below is workplace-scoped the same way
// every other module's list endpoint is (see auth/permissions.ts#workplaceScopeWhere) —
// an Admin gets organisation-wide numbers, everyone else sees only their own workplace.
export interface DashboardSummary {
  openHazards: number;
  reportedThisWeek: number;
  openFindings: number;
  openFindingsHighOrCritical: number;
  overdueActions: number;
  oldestOverdueDays: number;
  actionsAwaitingVerification: number;
  criticalHazards: number;
  criticalHazardWorkplaces: number;
  inspectionsThisMonth: number;
  inspectionsCompletedThisMonth: number;
  inspectionsUpcomingThisMonth: number;
  inspectionsDueSoon: number;
  /** ISO bounds of the "this month" window used for `inspectionsThisMonth` — `thisMonthEnd`
   * is exclusive — so the client can deep-link to a list filtered by the exact same range. */
  thisMonthStart: string;
  thisMonthEnd: string;
  closureRate: number;
  openIncidents: number;
  /** Open Incident/NearMiss records with potentialSeverity in (High, Critical) — the exact
   * condition the "High-Potential Events" card's deep link must also apply. */
  highPotentialEvents: number;
  /** eventType='NearMiss' within [thisMonthStart, thisMonthEnd) — same window as inspections. */
  nearMissesThisMonth: number;
  recentHazards: DashboardHazardSummary[];
  criticalFindings: DashboardFindingSummary[];
  overdueCorrectiveActions: DashboardCorrectiveActionSummary[];
  inProgressInspections: DashboardInspectionSummary[];
}
