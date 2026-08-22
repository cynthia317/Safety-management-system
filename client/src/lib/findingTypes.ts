import type { RiskLevel } from './hazardTypes';

export type FindingStatus = 'Open' | 'In Progress' | 'Awaiting Verification' | 'Closed';

export interface Finding {
  id: string;
  referenceNumber: string;
  title: string;
  description: string;
  workplace: string;
  department: string;
  location: string;
  riskLevel: RiskLevel;
  status: FindingStatus;
  hazardId: string | null;
  hazardReferenceNumber: string | null;
  inspectionId: string | null;
  inspectionReferenceNumber: string | null;
  createdBy: string;
  assignedTo: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export type FindingActivityType = 'created' | 'status_change' | 'updated' | 'comment';

export interface FindingActivityEntry {
  id: string;
  findingId: string;
  type: FindingActivityType;
  message: string;
  actor: string;
  createdAt: string;
}

export interface FindingComment {
  id: string;
  findingId: string;
  author: string;
  message: string;
  createdAt: string;
}

export interface FindingDetail extends Finding {
  activity: FindingActivityEntry[];
  comments: FindingComment[];
}

export interface FindingFormValues {
  title: string;
  description: string;
  workplace: string;
  department: string;
  location: string;
  riskLevel: RiskLevel | '';
  dueDate: string;
  createdBy: string;
  assignedTo: string;
}

export interface CreateFindingPayload {
  title: string;
  description: string;
  workplace: string;
  department: string;
  location: string;
  riskLevel: RiskLevel;
  hazardId: string | null;
  hazardReferenceNumber: string | null;
  inspectionId: string | null;
  inspectionReferenceNumber: string | null;
  createdBy: string;
  assignedTo: string;
  dueDate: string;
}

export interface UpdateFindingPayload {
  title?: string;
  description?: string;
  workplace?: string;
  department?: string;
  location?: string;
  riskLevel?: RiskLevel;
  status?: FindingStatus;
  assignedTo?: string;
  dueDate?: string;
  actor?: string;
}
