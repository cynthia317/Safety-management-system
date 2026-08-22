import type { RiskLevel } from './riskMatrix';

export type RiskAssessmentStatus = 'Draft' | 'Under Review' | 'Approved' | 'Closed';

export type AssessmentType =
  | 'Routine'
  | 'Task-Based'
  | 'New Process / Equipment'
  | 'Post-Incident'
  | 'Legal / Statutory'
  | 'Project / Construction';

export interface RiskAssessmentItem {
  id: string;
  hazard: string;
  whoMightBeHarmed: string;
  existingControls: string;
  likelihood: number;
  severity: number;
  riskScore: number;
  riskLevel: RiskLevel;
  additionalControls: string;
  residualLikelihood: number | null;
  residualSeverity: number | null;
  residualRiskScore: number | null;
  residualRiskLevel: RiskLevel | null;
  order: number;
}

export interface RiskAssessment {
  id: string;
  referenceNumber: string;
  title: string;
  assessmentType: AssessmentType;
  description: string;
  workplace: string;
  department: string;
  location: string;
  status: RiskAssessmentStatus;
  assessedBy: string;
  approvedBy: string;
  assessmentDate: string;
  nextReviewDate: string;
  items: RiskAssessmentItem[];
  overallRiskLevel: RiskLevel;
  createdAt: string;
  updatedAt: string;
}

export type RiskAssessmentActivityType = 'created' | 'status_change' | 'updated';

export interface RiskAssessmentActivityEntry {
  id: string;
  riskAssessmentId: string;
  type: RiskAssessmentActivityType;
  message: string;
  actor: string;
  createdAt: string;
}

export interface RiskAssessmentDetail extends RiskAssessment {
  activity: RiskAssessmentActivityEntry[];
}

export interface RiskAssessmentItemInput {
  id?: string;
  hazard: string;
  whoMightBeHarmed: string;
  existingControls: string;
  likelihood: number;
  severity: number;
  additionalControls: string;
  residualLikelihood: number | null;
  residualSeverity: number | null;
  order: number;
}

export interface CreateRiskAssessmentInput {
  title: string;
  assessmentType: AssessmentType;
  description: string;
  workplace: string;
  department: string;
  location: string;
  assessedBy: string;
  assessmentDate: string;
  nextReviewDate: string;
  items: RiskAssessmentItemInput[];
}

export interface UpdateRiskAssessmentInput {
  title?: string;
  assessmentType?: AssessmentType;
  description?: string;
  workplace?: string;
  department?: string;
  location?: string;
  status?: RiskAssessmentStatus;
  assessedBy?: string;
  approvedBy?: string;
  assessmentDate?: string;
  nextReviewDate?: string;
  items?: RiskAssessmentItemInput[];
  actor?: string;
}
