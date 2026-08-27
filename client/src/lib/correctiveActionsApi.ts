import { apiRequest } from './api';
import type {
  CorrectiveAction,
  CorrectiveActionComment,
  CorrectiveActionDetail,
  CorrectiveActionEvidenceItem,
  CorrectiveActionStats,
  CreateCorrectiveActionPayload,
  UpdateCorrectiveActionPayload,
} from './correctiveActionTypes';
import type { ListResult, PaginationMeta } from './pagination';

interface DataEnvelope<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ListCorrectiveActionsFilter {
  hazardId?: string;
  findingId?: string[];
  inspectionId?: string;
  riskAssessmentId?: string;
  status?: string;
  priority?: string;
  workplace?: string;
  assignedTo?: string;
  overdue?: boolean;
  search?: string;
  sort?: 'newest' | 'oldest' | 'dueDate' | 'priority';
  page?: number;
  pageSize?: number;
}

export function listCorrectiveActions(filter?: ListCorrectiveActionsFilter): Promise<ListResult<CorrectiveAction>> {
  const params = new URLSearchParams();
  if (filter?.hazardId) params.set('hazardId', filter.hazardId);
  for (const id of filter?.findingId ?? []) params.append('findingId', id);
  if (filter?.inspectionId) params.set('inspectionId', filter.inspectionId);
  if (filter?.riskAssessmentId) params.set('riskAssessmentId', filter.riskAssessmentId);
  if (filter?.status) params.set('status', filter.status);
  if (filter?.priority) params.set('priority', filter.priority);
  if (filter?.workplace) params.set('workplace', filter.workplace);
  if (filter?.assignedTo) params.set('assignedTo', filter.assignedTo);
  if (filter?.overdue) params.set('overdue', 'true');
  if (filter?.search) params.set('search', filter.search);
  if (filter?.sort) params.set('sort', filter.sort);
  if (filter?.page) params.set('page', String(filter.page));
  if (filter?.pageSize) params.set('pageSize', String(filter.pageSize));
  const query = params.toString();
  return apiRequest<DataEnvelope<CorrectiveAction[]>>(`/api/corrective-actions${query ? `?${query}` : ''}`).then((res) => ({
    items: res.data,
    meta: res.meta,
  }));
}

export function getCorrectiveActionStats(): Promise<CorrectiveActionStats> {
  return apiRequest<DataEnvelope<CorrectiveActionStats>>('/api/corrective-actions/stats').then((res) => res.data);
}

export function getCorrectiveAction(id: string): Promise<CorrectiveActionDetail> {
  return apiRequest<DataEnvelope<CorrectiveActionDetail>>(`/api/corrective-actions/${id}`).then((res) => res.data);
}

export function createCorrectiveAction(payload: CreateCorrectiveActionPayload): Promise<CorrectiveAction> {
  return apiRequest<DataEnvelope<CorrectiveAction>>('/api/corrective-actions', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function updateCorrectiveAction(
  id: string,
  payload: UpdateCorrectiveActionPayload,
): Promise<CorrectiveActionDetail> {
  return apiRequest<DataEnvelope<CorrectiveActionDetail>>(`/api/corrective-actions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function addCorrectiveActionComment(
  id: string,
  payload: { author: string; message: string },
): Promise<CorrectiveActionComment> {
  return apiRequest<DataEnvelope<CorrectiveActionComment>>(`/api/corrective-actions/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function addCorrectiveActionEvidence(
  id: string,
  payload: { files: { fileName: string; fileSize: number; mimeType: string; dataUrl: string }[]; uploadedBy: string },
): Promise<CorrectiveActionEvidenceItem[]> {
  return apiRequest<DataEnvelope<CorrectiveActionEvidenceItem[]>>(`/api/corrective-actions/${id}/evidence`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}
