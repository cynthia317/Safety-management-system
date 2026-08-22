import { apiRequest } from './api';
import type { CreateWorkplacePayload, UpdateWorkplacePayload, Workplace } from './workplaceTypes';

interface DataEnvelope<T> {
  data: T;
}

export function listWorkplaces(): Promise<Workplace[]> {
  return apiRequest<DataEnvelope<Workplace[]>>('/api/workplaces').then((res) => res.data);
}

export function getWorkplace(id: string): Promise<Workplace> {
  return apiRequest<DataEnvelope<Workplace>>(`/api/workplaces/${id}`).then((res) => res.data);
}

export function createWorkplace(payload: CreateWorkplacePayload): Promise<Workplace> {
  return apiRequest<DataEnvelope<Workplace>>('/api/workplaces', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function updateWorkplace(id: string, payload: UpdateWorkplacePayload): Promise<Workplace> {
  return apiRequest<DataEnvelope<Workplace>>(`/api/workplaces/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}
