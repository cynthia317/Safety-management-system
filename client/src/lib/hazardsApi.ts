import { apiRequest } from './api';
import type {
  CreateHazardPayload,
  HazardComment,
  HazardDetail,
  HazardReport,
  UpdateHazardPayload,
} from './hazardTypes';

interface DataEnvelope<T> {
  data: T;
}

export function listHazards(): Promise<HazardReport[]> {
  return apiRequest<DataEnvelope<HazardReport[]>>('/api/hazards').then((res) => res.data);
}

export function getHazard(id: string): Promise<HazardDetail> {
  return apiRequest<DataEnvelope<HazardDetail>>(`/api/hazards/${id}`).then((res) => res.data);
}

export function createHazard(payload: CreateHazardPayload): Promise<HazardReport> {
  return apiRequest<DataEnvelope<HazardReport>>('/api/hazards', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function updateHazard(id: string, payload: UpdateHazardPayload): Promise<HazardDetail> {
  return apiRequest<DataEnvelope<HazardDetail>>(`/api/hazards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function addHazardComment(
  id: string,
  payload: { author: string; message: string },
): Promise<HazardComment> {
  return apiRequest<DataEnvelope<HazardComment>>(`/api/hazards/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}
