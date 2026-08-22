export type WorkflowStatus =
  | 'Open'
  | 'Under Review'
  | 'In Progress'
  | 'Awaiting Verification'
  | 'Closed'
  | 'Overdue';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
