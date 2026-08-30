import type { RiskLevel } from './hazardTypes';

export type CorrectiveActionStatus = 'Assigned' | 'In Progress' | 'Awaiting Verification' | 'Verified' | 'Closed';

export type CorrectiveActionSourceType =
  | 'Hazard Report'
  | 'Inspection'
  | 'Finding'
  | 'Audit'
  | 'Risk Assessment'
  | 'Incident'
  | 'Manual Entry';

export interface CorrectiveAction {
  id: string;
  referenceNumber: string;
  title: string;
  description: string;
  workplace: string;
  department: string;
  location: string;
  priority: RiskLevel;
  status: CorrectiveActionStatus;
  sourceType: CorrectiveActionSourceType;
  findingId: string | null;
  findingReferenceNumber: string | null;
  hazardId: string | null;
  hazardReferenceNumber: string | null;
  inspectionId: string | null;
  inspectionReferenceNumber: string | null;
  riskAssessmentId: string | null;
  riskAssessmentReferenceNumber: string | null;
  incidentId: string | null;
  incidentReferenceNumber: string | null;
  externalSourceReference: string | null;
  createdBy: string;
  assignedTo: string;
  dueDate: string;
  responseNote: string;
  respondedAt: string | null;
  evidenceNote: string;
  verifiedBy: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export type CorrectiveActionActivityType = 'created' | 'status_change' | 'updated' | 'comment' | 'evidence_added';

export interface CorrectiveActionActivityEntry {
  id: string;
  correctiveActionId: string;
  type: CorrectiveActionActivityType;
  message: string;
  actor: string;
  createdAt: string;
}

export interface CorrectiveActionComment {
  id: string;
  correctiveActionId: string;
  author: string;
  message: string;
  createdAt: string;
}

export interface CorrectiveActionEvidenceItem {
  id: string;
  correctiveActionId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  dataUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface EvidenceInput {
  fileName: string;
  fileSize: number;
  mimeType: string;
  dataUrl: string;
}

export interface CorrectiveActionDetail extends CorrectiveAction {
  activity: CorrectiveActionActivityEntry[];
  comments: CorrectiveActionComment[];
  evidence: CorrectiveActionEvidenceItem[];
}

export interface CorrectiveActionFormValues {
  title: string;
  description: string;
  workplace: string;
  department: string;
  location: string;
  priority: RiskLevel | '';
  dueDate: string;
  createdBy: string;
  assignedTo: string;
  sourceType: CorrectiveActionSourceType;
  externalSourceReference: string;
}

export interface CreateCorrectiveActionPayload {
  title: string;
  description: string;
  workplace: string;
  department: string;
  location: string;
  priority: RiskLevel;
  sourceType: CorrectiveActionSourceType;
  findingId: string | null;
  findingReferenceNumber: string | null;
  hazardId: string | null;
  hazardReferenceNumber: string | null;
  inspectionId: string | null;
  inspectionReferenceNumber: string | null;
  riskAssessmentId: string | null;
  riskAssessmentReferenceNumber: string | null;
  incidentId: string | null;
  incidentReferenceNumber: string | null;
  externalSourceReference: string | null;
  createdBy: string;
  assignedTo: string;
  dueDate: string;
  evidence?: EvidenceInput[];
}

export interface UpdateCorrectiveActionPayload {
  title?: string;
  description?: string;
  workplace?: string;
  department?: string;
  location?: string;
  priority?: RiskLevel;
  status?: CorrectiveActionStatus;
  assignedTo?: string;
  dueDate?: string;
  responseNote?: string;
  evidenceNote?: string;
  verifiedBy?: string;
  actor?: string;
}

export interface CorrectiveActionStats {
  totalActions: number;
  byStatus: Record<CorrectiveActionStatus, number>;
  overdueCount: number;
  closedThisMonth: number;
  byDepartment: { department: string; count: number }[];
  byPriority: Record<RiskLevel, number>;
  monthlyClosureTrend: { month: string; count: number }[];
  averageClosureDays: number | null;
  criticalOpenCount: number;
  closureRate: number;
}
