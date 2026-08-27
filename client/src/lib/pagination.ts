export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Every list API now returns this shape. `meta` is only present when the caller passed
 * `page`/`pageSize` — omitting them (as every "related records" panel does) gets the
 * pre-Phase-4 unbounded array back, just wrapped the same way. */
export interface ListResult<T> {
  items: T[];
  meta?: PaginationMeta;
}
