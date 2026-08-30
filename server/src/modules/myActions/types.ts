export type MyActionModule = 'hazard' | 'finding' | 'inspection' | 'risk_assessment' | 'corrective_action' | 'incident';

export type MyActionPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface MyActionItem {
  id: string;
  module: MyActionModule;
  referenceNumber: string;
  title: string;
  status: string;
  priority: MyActionPriority | null;
  dueDate: string | null;
  workplace: string;
  route: string;
  overdue: boolean;
  dueSoon: boolean;
  active: boolean;
  awaitingVerification: boolean;
  recentlyCompleted: boolean;
}

export interface MyActionsCounts {
  all: number;
  overdue: number;
  dueSoon: number;
  active: number;
  awaitingVerification: number;
  recentlyCompleted: number;
}

export interface MyActionsResponse {
  items: MyActionItem[];
  counts: MyActionsCounts;
}
