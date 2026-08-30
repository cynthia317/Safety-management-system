import { apiRequest } from './api';
import type {
  CreateIncidentPayload,
  Incident,
  IncidentComment,
  IncidentDetail,
  IncidentEvidenceItem,
  UpdateIncidentPayload,
} from './incidentTypes';
import type { ListResult, PaginationMeta } from './pagination';

interface DataEnvelope<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ListIncidentsFilter {
  eventType?: string;
  category?: string;
  status?: string;
  /** Exact match against potentialSeverity. */
  severity?: string;
  /** potentialSeverity IN (High, Critical) — same condition as the dashboard's
   * "High-Potential Events" card, kept distinct from `severity` so the two never drift. */
  highPotential?: boolean;
  workplace?: string;
  department?: string;
  /** 'me' resolves server-side to the authenticated caller's own name. */
  investigator?: string;
  /** Status not in (Resolved, Closed) — ignored if `status` is also set. */
  openOnly?: boolean;
  /** ISO date/datetime strings — inclusive lower bound / exclusive upper bound on eventDate. */
  from?: string;
  to?: string;
  search?: string;
  sort?: 'newest' | 'oldest';
  page?: number;
  pageSize?: number;
}

export function listIncidents(filter?: ListIncidentsFilter): Promise<ListResult<Incident>> {
  const params = new URLSearchParams();
  if (filter?.eventType) params.set('eventType', filter.eventType);
  if (filter?.category) params.set('category', filter.category);
  if (filter?.status) params.set('status', filter.status);
  if (filter?.severity) params.set('severity', filter.severity);
  if (filter?.highPotential) params.set('highPotential', 'true');
  if (filter?.workplace) params.set('workplace', filter.workplace);
  if (filter?.department) params.set('department', filter.department);
  if (filter?.investigator) params.set('investigator', filter.investigator);
  if (filter?.openOnly) params.set('openOnly', 'true');
  if (filter?.from) params.set('from', filter.from);
  if (filter?.to) params.set('to', filter.to);
  if (filter?.search) params.set('search', filter.search);
  if (filter?.sort) params.set('sort', filter.sort);
  if (filter?.page) params.set('page', String(filter.page));
  if (filter?.pageSize) params.set('pageSize', String(filter.pageSize));
  const query = params.toString();
  return apiRequest<DataEnvelope<Incident[]>>(`/api/incidents${query ? `?${query}` : ''}`).then((res) => ({
    items: res.data,
    meta: res.meta,
  }));
}

export function getIncident(id: string): Promise<IncidentDetail> {
  return apiRequest<DataEnvelope<IncidentDetail>>(`/api/incidents/${id}`).then((res) => res.data);
}

export function createIncident(payload: CreateIncidentPayload): Promise<IncidentDetail> {
  return apiRequest<DataEnvelope<IncidentDetail>>('/api/incidents', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function updateIncident(id: string, payload: UpdateIncidentPayload): Promise<IncidentDetail> {
  return apiRequest<DataEnvelope<IncidentDetail>>(`/api/incidents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function addIncidentComment(id: string, payload: { author: string; message: string }): Promise<IncidentComment> {
  return apiRequest<DataEnvelope<IncidentComment>>(`/api/incidents/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function addIncidentEvidence(
  id: string,
  payload: { uploadedBy: string; files: { fileName: string; fileSize: number; mimeType: string; dataUrl: string }[] },
): Promise<IncidentEvidenceItem[]> {
  return apiRequest<DataEnvelope<IncidentEvidenceItem[]>>(`/api/incidents/${id}/evidence`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}
