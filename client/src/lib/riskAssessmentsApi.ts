import { apiRequest } from './api';
import type {
  CreateRiskAssessmentPayload,
  RiskAssessment,
  RiskAssessmentDetail,
  UpdateRiskAssessmentPayload,
} from './riskAssessmentTypes';

interface DataEnvelope<T> {
  data: T;
}

export function listRiskAssessments(): Promise<RiskAssessment[]> {
  return apiRequest<DataEnvelope<RiskAssessment[]>>('/api/risk-assessments').then((res) => res.data);
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
