import { apiRequest } from './api';
import type {
  CreateHazardPayload,
  HazardComment,
  HazardDetail,
  HazardReport,
  UpdateHazardPayload,
} from './hazardTypes';
import type { ListResult, PaginationMeta } from './pagination';

interface DataEnvelope<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ListHazardsFilter {
  status?: string;
  riskLevel?: string;
  workplace?: string;
  /** 'me' resolves server-side to the authenticated caller's own name; 'unassigned'
   * matches reports with no assignee. */
  assignedTo?: string;
  overdue?: boolean;
  /** Status is one of the three non-closed statuses — ignored if `status` is also set. */
  openOnly?: boolean;
  hazardCategory?: string;
  /** ISO date string — only reports reported on/after this date. */
  reportedAfter?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'risk';
  page?: number;
  pageSize?: number;
}

export function listHazards(filter?: ListHazardsFilter): Promise<ListResult<HazardReport>> {
  const params = new URLSearchParams();
  if (filter?.status) params.set('status', filter.status);
  if (filter?.riskLevel) params.set('riskLevel', filter.riskLevel);
  if (filter?.workplace) params.set('workplace', filter.workplace);
  if (filter?.assignedTo) params.set('assignedTo', filter.assignedTo);
  if (filter?.overdue) params.set('overdue', 'true');
  if (filter?.openOnly) params.set('openOnly', 'true');
  if (filter?.hazardCategory) params.set('hazardCategory', filter.hazardCategory);
  if (filter?.reportedAfter) params.set('reportedAfter', filter.reportedAfter);
  if (filter?.search) params.set('search', filter.search);
  if (filter?.sort) params.set('sort', filter.sort);
  if (filter?.page) params.set('page', String(filter.page));
  if (filter?.pageSize) params.set('pageSize', String(filter.pageSize));
  const query = params.toString();
  return apiRequest<DataEnvelope<HazardReport[]>>(`/api/hazards${query ? `?${query}` : ''}`).then((res) => ({
    items: res.data,
    meta: res.meta,
  }));
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
