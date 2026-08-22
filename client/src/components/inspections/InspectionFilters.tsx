import { Search, X } from 'lucide-react';
import { Input } from '../form/Input';
import { Select } from '../form/Select';
import { Button } from '../Button';
import { INSPECTION_STATUSES } from '../../lib/inspectionOptions';
import type { InspectionStatus } from '../../lib/inspectionTypes';

export type InspectionSortOrder = 'newest' | 'oldest' | 'workplace' | 'status';

export interface InspectionFiltersState {
  search: string;
  status: InspectionStatus | 'all';
  templateId: string | 'all';
  workplace: string | 'all';
  inspector: string | 'all';
  sort: InspectionSortOrder;
}

export const DEFAULT_INSPECTION_FILTERS: InspectionFiltersState = {
  search: '',
  status: 'all',
  templateId: 'all',
  workplace: 'all',
  inspector: 'all',
  sort: 'newest',
};

interface InspectionFiltersProps {
  value: InspectionFiltersState;
  onChange: (value: InspectionFiltersState) => void;
  templateOptions: { id: string; name: string }[];
  workplaceOptions: string[];
  inspectorOptions: string[];
}

export function InspectionFilters({
  value,
  onChange,
  templateOptions,
  workplaceOptions,
  inspectorOptions,
}: InspectionFiltersProps) {
  const hasActiveFilters =
    value.search !== '' ||
    value.status !== 'all' ||
    value.templateId !== 'all' ||
    value.workplace !== 'all' ||
    value.inspector !== 'all';

  function update<K extends keyof InspectionFiltersState>(key: K, next: InspectionFiltersState[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={value.search}
          onChange={(e) => update('search', e.target.value)}
          placeholder="Search by reference, title, or workplace…"
          className="pl-8"
          aria-label="Search inspections"
        />
      </div>

      <Select
        value={value.status}
        onChange={(e) => update('status', e.target.value as InspectionFiltersState['status'])}
        aria-label="Filter by status"
        className="w-auto min-w-[140px]"
      >
        <option value="all">All Statuses</option>
        {INSPECTION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>

      <Select
        value={value.templateId}
        onChange={(e) => update('templateId', e.target.value)}
        aria-label="Filter by template"
        className="w-auto min-w-[160px]"
      >
        <option value="all">All Templates</option>
        {templateOptions.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>

      <Select
        value={value.workplace}
        onChange={(e) => update('workplace', e.target.value)}
        aria-label="Filter by workplace"
        className="w-auto min-w-[150px]"
      >
        <option value="all">All Workplaces</option>
        {workplaceOptions.map((w) => (
          <option key={w} value={w}>
            {w}
          </option>
        ))}
      </Select>

      <Select
        value={value.inspector}
        onChange={(e) => update('inspector', e.target.value)}
        aria-label="Filter by inspector"
        className="w-auto min-w-[150px]"
      >
        <option value="all">All Inspectors</option>
        {inspectorOptions.map((i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </Select>

      <Select
        value={value.sort}
        onChange={(e) => update('sort', e.target.value as InspectionSortOrder)}
        aria-label="Sort order"
        className="w-auto min-w-[140px]"
      >
        <option value="newest">Most recent</option>
        <option value="oldest">Oldest</option>
        <option value="workplace">Workplace</option>
        <option value="status">Status</option>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" onClick={() => onChange(DEFAULT_INSPECTION_FILTERS)} className="px-2.5">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
