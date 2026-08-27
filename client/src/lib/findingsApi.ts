import { apiRequest } from './api';
import type { CreateFindingPayload, Finding, FindingComment, FindingDetail, UpdateFindingPayload } from './findingTypes';
import type { ListResult, PaginationMeta } from './pagination';

interface DataEnvelope<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ListFindingsFilter {
  hazardId?: string;
  inspectionId?: string;
  status?: string;
  riskLevel?: string;
  workplace?: string;
  assignedTo?: string;
  overdue?: boolean;
  openOnly?: boolean;
  search?: string;
  sort?: 'newest' | 'oldest' | 'dueDate' | 'risk';
  page?: number;
  pageSize?: number;
}

export function listFindings(filter?: ListFindingsFilter): Promise<ListResult<Finding>> {
  const params = new URLSearchParams();
  if (filter?.hazardId) params.set('hazardId', filter.hazardId);
  if (filter?.inspectionId) params.set('inspectionId', filter.inspectionId);
  if (filter?.status) params.set('status', filter.status);
  if (filter?.riskLevel) params.set('riskLevel', filter.riskLevel);
  if (filter?.workplace) params.set('workplace', filter.workplace);
  if (filter?.assignedTo) params.set('assignedTo', filter.assignedTo);
  if (filter?.overdue) params.set('overdue', 'true');
  if (filter?.openOnly) params.set('openOnly', 'true');
  if (filter?.search) params.set('search', filter.search);
  if (filter?.sort) params.set('sort', filter.sort);
  if (filter?.page) params.set('page', String(filter.page));
  if (filter?.pageSize) params.set('pageSize', String(filter.pageSize));
  const query = params.toString();
  return apiRequest<DataEnvelope<Finding[]>>(`/api/findings${query ? `?${query}` : ''}`).then((res) => ({
    items: res.data,
    meta: res.meta,
  }));
}

export function getFinding(id: string): Promise<FindingDetail> {
  return apiRequest<DataEnvelope<FindingDetail>>(`/api/findings/${id}`).then((res) => res.data);
}

export function createFinding(payload: CreateFindingPayload): Promise<Finding> {
  return apiRequest<DataEnvelope<Finding>>('/api/findings', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function updateFinding(id: string, payload: UpdateFindingPayload): Promise<FindingDetail> {
  return apiRequest<DataEnvelope<FindingDetail>>(`/api/findings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

/**
 * Transactionally turns a flagged inspection response into a real Finding — the backend
 * links Finding.inspectionId/questionResponseId and flips the response's
 * potentialFinding.status to 'Created' in one step (see
 * server/src/modules/findings/service.ts#createFindingFromInspectionResponse). Safe to
 * call more than once for the same response — the backend reuses the existing Finding
 * rather than creating a duplicate.
 */
export function createFindingFromInspectionResponse(
  inspectionId: string,
  questionId: string,
  payload: { title: string; description: string; riskLevel: string; assignedTo: string; dueDate: string },
): Promise<Finding> {
  return apiRequest<DataEnvelope<Finding>>(`/api/inspections/${inspectionId}/responses/${questionId}/finding`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function addFindingComment(
  id: string,
  payload: { author: string; message: string },
): Promise<FindingComment> {
  return apiRequest<DataEnvelope<FindingComment>>(`/api/findings/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}
