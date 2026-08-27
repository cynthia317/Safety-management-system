export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginationRequest {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Pagination is opt-in: returns undefined when the caller sent neither `page` nor
 * `pageSize`, which tells the route handler to fall back to its pre-Phase-4 unbounded
 * behavior (still used by ~10 "related records" call sites — e.g. corrective actions for
 * one finding — that legitimately want every matching row, not one page of it).
 */
export function parsePagination(query: Record<string, unknown>): PaginationRequest | undefined {
  const rawPage = query.page;
  const rawPageSize = query.pageSize;
  if (rawPage === undefined && rawPageSize === undefined) return undefined;

  const page = Math.max(1, Math.trunc(Number(rawPage)) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number(rawPageSize)) || DEFAULT_PAGE_SIZE));

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paginationMeta(total: number, pagination: PaginationRequest): PaginationMeta {
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  };
}
