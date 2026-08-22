import type { AssessmentType, RiskAssessmentStatus } from './riskAssessmentTypes';

export const ASSESSMENT_TYPES: AssessmentType[] = [
  'Routine',
  'Task-Based',
  'New Process / Equipment',
  'Post-Incident',
  'Legal / Statutory',
  'Project / Construction',
];

export const RISK_ASSESSMENT_STATUSES: RiskAssessmentStatus[] = ['Draft', 'Under Review', 'Approved', 'Closed'];
