import { apiRequest } from './api';
import type { CreateTemplatePayload, InspectionTemplate, InspectionTemplateDetail, UpdateTemplatePayload } from './inspectionTemplateTypes';

interface DataEnvelope<T> {
  data: T;
}

export function listTemplates(): Promise<InspectionTemplate[]> {
  return apiRequest<DataEnvelope<InspectionTemplate[]>>('/api/inspection-templates').then((res) => res.data);
}

export function getTemplate(id: string): Promise<InspectionTemplateDetail> {
  return apiRequest<DataEnvelope<InspectionTemplateDetail>>(`/api/inspection-templates/${id}`).then((res) => res.data);
}

export function createTemplate(payload: CreateTemplatePayload): Promise<InspectionTemplateDetail> {
  return apiRequest<DataEnvelope<InspectionTemplateDetail>>('/api/inspection-templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function updateTemplate(id: string, payload: UpdateTemplatePayload): Promise<InspectionTemplateDetail> {
  return apiRequest<DataEnvelope<InspectionTemplateDetail>>(`/api/inspection-templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function duplicateTemplate(id: string): Promise<InspectionTemplateDetail> {
  return apiRequest<DataEnvelope<InspectionTemplateDetail>>(`/api/inspection-templates/${id}/duplicate`, {
    method: 'POST',
  }).then((res) => res.data);
}
