import { apiRequest } from './api';
import type { CreateWorkplacePayload, UpdateWorkplacePayload, Workplace, WorkplaceDetail } from './workplaceTypes';

interface DataEnvelope<T> {
  data: T;
}

export function listWorkplaces(): Promise<Workplace[]> {
  return apiRequest<DataEnvelope<Workplace[]>>('/api/workplaces').then((res) => res.data);
}

export function getWorkplace(id: string): Promise<WorkplaceDetail> {
  return apiRequest<DataEnvelope<WorkplaceDetail>>(`/api/workplaces/${id}`).then((res) => res.data);
}

export function createWorkplace(payload: CreateWorkplacePayload): Promise<WorkplaceDetail> {
  return apiRequest<DataEnvelope<WorkplaceDetail>>('/api/workplaces', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function updateWorkplace(id: string, payload: UpdateWorkplacePayload): Promise<WorkplaceDetail> {
  return apiRequest<DataEnvelope<WorkplaceDetail>>(`/api/workplaces/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}
