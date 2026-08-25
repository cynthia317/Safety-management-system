import { apiRequest } from './api';
import type { CreateFindingPayload, Finding, FindingComment, FindingDetail, UpdateFindingPayload } from './findingTypes';

interface DataEnvelope<T> {
  data: T;
}

export function listFindings(filter?: { hazardId?: string; inspectionId?: string }): Promise<Finding[]> {
  const params = new URLSearchParams();
  if (filter?.hazardId) params.set('hazardId', filter.hazardId);
  if (filter?.inspectionId) params.set('inspectionId', filter.inspectionId);
  const query = params.toString();
  return apiRequest<DataEnvelope<Finding[]>>(`/api/findings${query ? `?${query}` : ''}`).then((res) => res.data);
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
