import { apiRequest } from './api';
import type {
  CreateRiskAssessmentPayload,
  RiskAssessment,
  RiskAssessmentDetail,
  UpdateRiskAssessmentPayload,
} from './riskAssessmentTypes';
import type { ListResult, PaginationMeta } from './pagination';

interface DataEnvelope<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ListRiskAssessmentsFilter {
  hazardId?: string;
  status?: string;
  riskLevel?: string;
  workplace?: string;
  assignedTo?: string;
  search?: string;
  sort?: 'newest' | 'oldest';
  page?: number;
  pageSize?: number;
}

export function listRiskAssessments(filter?: ListRiskAssessmentsFilter): Promise<ListResult<RiskAssessment>> {
  const params = new URLSearchParams();
  if (filter?.hazardId) params.set('hazardId', filter.hazardId);
  if (filter?.status) params.set('status', filter.status);
  if (filter?.riskLevel) params.set('riskLevel', filter.riskLevel);
  if (filter?.workplace) params.set('workplace', filter.workplace);
  if (filter?.assignedTo) params.set('assignedTo', filter.assignedTo);
  if (filter?.search) params.set('search', filter.search);
  if (filter?.sort) params.set('sort', filter.sort);
  if (filter?.page) params.set('page', String(filter.page));
  if (filter?.pageSize) params.set('pageSize', String(filter.pageSize));
  const query = params.toString();
  return apiRequest<DataEnvelope<RiskAssessment[]>>(`/api/risk-assessments${query ? `?${query}` : ''}`).then((res) => ({
    items: res.data,
    meta: res.meta,
  }));
}

export function getRiskAssessment(id: string): Promise<RiskAssessmentDetail> {
  return apiRequest<DataEnvelope<RiskAssessmentDetail>>(`/api/risk-assessments/${id}`).then((res) => res.data);
}

export function createRiskAssessment(payload: CreateRiskAssessmentPayload): Promise<RiskAssessment> {
  return apiRequest<DataEnvelope<RiskAssessment>>('/api/risk-assessments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function updateRiskAssessment(id: string, payload: UpdateRiskAssessmentPayload): Promise<RiskAssessmentDetail> {
  return apiRequest<DataEnvelope<RiskAssessmentDetail>>(`/api/risk-assessments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}
