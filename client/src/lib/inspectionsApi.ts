import { apiRequest, ApiError } from './api';
import type {
  CreateInspectionPayload,
  Inspection,
  InspectionDetail,
  RequiredQuestionSummary,
  ResponseInput,
  UpdateInspectionPayload,
} from './inspectionTypes';

interface DataEnvelope<T> {
  data: T;
}

export function listInspections(): Promise<Inspection[]> {
  return apiRequest<DataEnvelope<Inspection[]>>('/api/inspections').then((res) => res.data);
}

export function getInspection(id: string): Promise<InspectionDetail> {
  return apiRequest<DataEnvelope<InspectionDetail>>(`/api/inspections/${id}`).then((res) => res.data);
}

export function createInspection(payload: CreateInspectionPayload): Promise<Inspection> {
  return apiRequest<DataEnvelope<Inspection>>('/api/inspections', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function updateInspection(id: string, payload: UpdateInspectionPayload): Promise<InspectionDetail> {
  return apiRequest<DataEnvelope<InspectionDetail>>(`/api/inspections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function saveResponses(
  id: string,
  responses: ResponseInput[],
  actor: string,
): Promise<InspectionDetail> {
  return apiRequest<DataEnvelope<InspectionDetail>>(`/api/inspections/${id}/responses`, {
    method: 'POST',
    body: JSON.stringify({ responses, actor }),
  }).then((res) => res.data);
}

export class InspectionIncompleteError extends Error {
  readonly missing: RequiredQuestionSummary[];

  constructor(missing: RequiredQuestionSummary[]) {
    super(`${missing.length} required question${missing.length === 1 ? '' : 's'} still need a response.`);
    this.name = 'InspectionIncompleteError';
    this.missing = missing;
  }
}

export async function submitInspection(id: string, actor: string): Promise<InspectionDetail> {
  try {
    const res = await apiRequest<DataEnvelope<InspectionDetail>>(`/api/inspections/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ actor }),
    });
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.code === 'INCOMPLETE') {
      const payload = err.payload as { missing?: RequiredQuestionSummary[] } | undefined;
      throw new InspectionIncompleteError(payload?.missing ?? []);
    }
    throw err;
  }
}
