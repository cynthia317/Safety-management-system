export type EventType = 'Incident' | 'NearMiss';

export type IncidentCategory =
  | 'Injury/Illness'
  | 'Property Damage'
  | 'Environmental'
  | 'Fire'
  | 'Equipment'
  | 'Vehicle'
  | 'Security'
  | 'Other';

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export type InjurySeverity = 'None' | 'First Aid' | 'Medical Treatment' | 'Lost Time' | 'Fatality';

export type IncidentStatus = 'Reported' | 'Under Investigation' | 'Action Required' | 'Resolved' | 'Closed';

export interface Incident {
  id: string;
  referenceNumber: string;
  eventType: EventType;
  category: IncidentCategory;
  title: string;
  description: string;
  workplace: string;
  department: string;
  location: string;
  eventDate: string;
  reportedBy: string;
  reportedAt: string;
  peopleInvolved: string;
  injuryOccurred: boolean;
  injurySeverity: InjurySeverity | null;
  immediateActionTaken: string;
  actualSeverity: Severity;
  potentialSeverity: Severity;
  status: IncidentStatus;
  leadInvestigator: string;
  investigationSummary: string;
  rootCause: string;
  contributingFactors: string;
  lessonsLearned: string;
  hazardId: string | null;
  hazardReferenceNumber: string | null;
  updatedAt: string;
}

export type IncidentActivityType =
  | 'created'
  | 'updated'
  | 'status_change'
  | 'investigator_assigned'
  | 'evidence_added'
  | 'corrective_action_created'
  | 'comment';

export interface IncidentActivityEntry {
  id: string;
  incidentId: string;
  type: IncidentActivityType;
  message: string;
  actor: string;
  createdAt: string;
}

export interface IncidentComment {
  id: string;
  incidentId: string;
  author: string;
  message: string;
  createdAt: string;
}

export interface IncidentEvidenceItem {
  id: string;
  incidentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  dataUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface EvidenceUploadInput {
  fileName: string;
  fileSize: number;
  mimeType: string;
  dataUrl: string;
}

export interface IncidentDetail extends Incident {
  activity: IncidentActivityEntry[];
  comments: IncidentComment[];
  evidence: IncidentEvidenceItem[];
}

export interface CreateIncidentPayload {
  eventType: EventType;
  category: IncidentCategory;
  title: string;
  description: string;
  workplace: string;
  department: string;
  location: string;
  eventDate: string;
  peopleInvolved: string;
  injuryOccurred: boolean;
  injurySeverity: InjurySeverity | null;
  immediateActionTaken: string;
  actualSeverity: Severity;
  potentialSeverity: Severity;
  hazardId: string | null;
  evidence: EvidenceUploadInput[];
}

export interface UpdateIncidentPayload {
  eventType?: EventType;
  category?: IncidentCategory;
  title?: string;
  description?: string;
  workplace?: string;
  department?: string;
  location?: string;
  eventDate?: string;
  peopleInvolved?: string;
  injuryOccurred?: boolean;
  injurySeverity?: InjurySeverity | null;
  immediateActionTaken?: string;
  actualSeverity?: Severity;
  potentialSeverity?: Severity;
  status?: IncidentStatus;
  leadInvestigator?: string;
  investigationSummary?: string;
  rootCause?: string;
  contributingFactors?: string;
  lessonsLearned?: string;
  hazardId?: string | null;
  actor?: string;
}
