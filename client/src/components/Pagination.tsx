import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import type { PaginationMeta } from '../lib/pagination';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  if (meta.totalPages <= 1) return null;

  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.total, meta.page * meta.pageSize);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
      <p className="text-xs text-muted">
        {from}&ndash;{to} of {meta.total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          className="px-2.5 py-1.5"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted">
          Page {meta.page} of {meta.totalPages}
        </span>
        <Button
          variant="secondary"
          className="px-2.5 py-1.5"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
