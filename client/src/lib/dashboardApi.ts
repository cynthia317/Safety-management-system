import { apiRequest } from './api';

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
  thisMonthStart: string;
  thisMonthEnd: string;
  closureRate: number;
  recentHazards: DashboardHazardSummary[];
  criticalFindings: DashboardFindingSummary[];
  overdueCorrectiveActions: DashboardCorrectiveActionSummary[];
  inProgressInspections: DashboardInspectionSummary[];
}

interface DataEnvelope<T> {
  data: T;
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return apiRequest<DataEnvelope<DashboardSummary>>('/api/dashboard/summary').then((res) => res.data);
}
