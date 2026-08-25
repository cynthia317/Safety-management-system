import { apiRequest } from './api';
import type { CreateFindingPayload, Finding, FindingComment, FindingDetail, UpdateFindingPayload } from './findingTypes';

interface DataEnvelope<T> {
  data: T;
}

export function listFindings(filter?: { hazardId?: string }): Promise<Finding[]> {
  const query = filter?.hazardId ? `?hazardId=${encodeURIComponent(filter.hazardId)}` : '';
  return apiRequest<DataEnvelope<Finding[]>>(`/api/findings${query}`).then((res) => res.data);
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

export function addFindingComment(
  id: string,
  payload: { author: string; message: string },
): Promise<FindingComment> {
  return apiRequest<DataEnvelope<FindingComment>>(`/api/findings/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}
