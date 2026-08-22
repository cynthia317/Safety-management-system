export type ReportType =
  | 'Unsafe Condition'
  | 'Unsafe Act'
  | 'Near Miss'
  | 'Equipment Defect'
  | 'Environmental Concern'
  | 'Positive Safety Observation';

export type HazardCategory =
  | 'Fire Safety'
  | 'Mechanical'
  | 'Electrical'
  | 'Chemical'
  | 'Slip, Trip & Fall'
  | 'Ergonomic'
  | 'PPE'
  | 'Environmental'
  | 'Other';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type HazardStatus = 'New' | 'Under Review' | 'Action Required' | 'Resolved' | 'Closed';

export interface HazardReport {
  id: string;
  referenceNumber: string;
  title: string;
  description: string;
  reportType: ReportType;
  hazardCategory: HazardCategory;
  workplace: string;
  department: string;
  location: string;
  peopleAtRisk: string;
  immediateActionTaken: string;
  riskLevel: RiskLevel;
  status: HazardStatus;
  reportedBy: string;
  assignedTo: string;
  reportedAt: string;
  updatedAt: string;
}

export type HazardActivityType = 'created' | 'status_change' | 'updated' | 'comment';

export interface HazardActivityEntry {
  id: string;
  hazardId: string;
  type: HazardActivityType;
  message: string;
  actor: string;
  createdAt: string;
}

export interface HazardComment {
  id: string;
  hazardId: string;
  author: string;
  message: string;
  createdAt: string;
}

export interface HazardEvidenceItem {
  id: string;
  hazardId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  dataUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface HazardDetail extends HazardReport {
  activity: HazardActivityEntry[];
  comments: HazardComment[];
  evidence: HazardEvidenceItem[];
}

export interface EvidenceInput {
  fileName: string;
  fileSize: number;
  mimeType: string;
  dataUrl: string;
}

export interface CreateHazardInput {
  title: string;
  description: string;
  reportType: ReportType;
  hazardCategory: HazardCategory;
  workplace: string;
  department: string;
  location: string;
  peopleAtRisk: string;
  immediateActionTaken: string;
  riskLevel: RiskLevel;
  reportedBy: string;
  assignedTo: string;
  evidence: EvidenceInput[];
}

export interface UpdateHazardInput {
  title?: string;
  description?: string;
  reportType?: ReportType;
  hazardCategory?: HazardCategory;
  workplace?: string;
  department?: string;
  location?: string;
  peopleAtRisk?: string;
  immediateActionTaken?: string;
  riskLevel?: RiskLevel;
  status?: HazardStatus;
  assignedTo?: string;
  actor?: string;
}

export interface CreateCommentInput {
  author: string;
  message: string;
}
