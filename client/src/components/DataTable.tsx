import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { EmptyState } from './EmptyState';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  getRowClassName?: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyMessage = 'No records found.',
  getRowClassName,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <EmptyState icon={Inbox} title="No data" description={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={getRowKey(row)}
              className={`border-b border-border/60 last:border-b-0 hover:bg-surface-hover ${getRowClassName?.(row) ?? ''}`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-2.5 align-middle text-body ${col.className ?? ''}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
