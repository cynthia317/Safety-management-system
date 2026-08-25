import type { InspectionTemplate, QuestionResponseType } from './inspectionTemplateTypes';
import type { RiskLevel } from './hazardTypes';

export type InspectionStatus = 'Draft' | 'In Progress' | 'Submitted' | 'Reviewed' | 'Closed';

export type PotentialFindingStatus = 'Potential' | 'Dismissed' | 'Created';

export interface PotentialFinding {
  id: string;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  recommendation: string;
  immediateAction: string;
  status: PotentialFindingStatus;
}

export interface QuestionResponse {
  questionId: string;
  sectionId: string;
  responseType: QuestionResponseType;
  value: string;
  notes: string;
  evidenceNote: string;
  potentialFinding: PotentialFinding | null;
  answeredAt: string;
}

export type InspectionActivityType =
  | 'created'
  | 'started'
  | 'response_saved'
  | 'non_compliance_recorded'
  | 'section_completed'
  | 'saved'
  | 'submitted'
  | 'status_change'
  | 'updated'
  | 'finding_created';

export interface InspectionActivityEntry {
  id: string;
  inspectionId: string;
  type: InspectionActivityType;
  message: string;
  actor: string;
  createdAt: string;
}

export interface Inspection {
  id: string;
  referenceNumber: string;
  title: string;
  status: InspectionStatus;
  templateId: string;
  templateName: string;
  templateVersion: number;
  templateSnapshot: InspectionTemplate;
  organisation: string;
  workplace: string;
  area: string;
  specificLocation: string;
  inspectionDate: string;
  leadInspector: string;
  additionalInspectors: string[];
  purpose: string;
  scope: string;
  responses: QuestionResponse[];
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface InspectionDetail extends Inspection {
  activity: InspectionActivityEntry[];
}

export interface CreateInspectionPayload {
  templateId: string;
  title: string;
  organisation: string;
  workplace: string;
  area: string;
  specificLocation: string;
  inspectionDate: string;
  leadInspector: string;
  additionalInspectors: string[];
  purpose: string;
  scope: string;
}

export interface UpdateInspectionPayload {
  title?: string;
  organisation?: string;
  workplace?: string;
  area?: string;
  specificLocation?: string;
  inspectionDate?: string;
  leadInspector?: string;
  additionalInspectors?: string[];
  purpose?: string;
  scope?: string;
  status?: InspectionStatus;
  actor?: string;
}

export interface ResponseInput {
  questionId: string;
  sectionId: string;
  responseType: QuestionResponseType;
  value: string;
  notes: string;
  evidenceNote: string;
  potentialFinding: PotentialFinding | null;
}

export interface RequiredQuestionSummary {
  questionId: string;
  sectionTitle: string;
  text: string;
}
