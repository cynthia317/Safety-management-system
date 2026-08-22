import { Search, X } from 'lucide-react';
import { Input } from '../form/Input';
import { Select } from '../form/Select';
import { Button } from '../Button';
import { RISK_LEVELS } from '../../lib/hazardOptions';
import { FINDING_STATUSES } from '../../lib/findingOptions';
import type { FindingStatus } from '../../lib/findingTypes';
import type { RiskLevel } from '../../lib/hazardTypes';

export type FindingSortOrder = 'risk' | 'dueDate' | 'newest';

export interface FindingFiltersState {
  search: string;
  risk: RiskLevel | 'all';
  status: FindingStatus | 'all';
  workplace: string | 'all';
  sort: FindingSortOrder;
}

export const DEFAULT_FINDING_FILTERS: FindingFiltersState = {
  search: '',
  risk: 'all',
  status: 'all',
  workplace: 'all',
  sort: 'risk',
};

interface FindingFiltersProps {
  value: FindingFiltersState;
  onChange: (value: FindingFiltersState) => void;
  workplaceOptions: string[];
}

export function FindingFilters({ value, onChange, workplaceOptions }: FindingFiltersProps) {
  const hasActiveFilters =
    value.search !== '' || value.risk !== 'all' || value.status !== 'all' || value.workplace !== 'all';

  function update<K extends keyof FindingFiltersState>(key: K, next: FindingFiltersState[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={value.search}
          onChange={(e) => update('search', e.target.value)}
          placeholder="Search by reference, title, or location…"
          className="pl-8"
          aria-label="Search findings"
        />
      </div>

      <Select
        value={value.risk}
        onChange={(e) => update('risk', e.target.value as FindingFiltersState['risk'])}
        aria-label="Filter by risk level"
        className="w-auto min-w-[130px]"
      >
        <option value="all">All Risk Levels</option>
        {RISK_LEVELS.map((level) => (
          <option key={level} value={level}>
            {level} Risk
          </option>
        ))}
      </Select>

      <Select
        value={value.status}
        onChange={(e) => update('status', e.target.value as FindingFiltersState['status'])}
        aria-label="Filter by status"
        className="w-auto min-w-[150px]"
      >
        <option value="all">All Statuses</option>
        {FINDING_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
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
        value={value.sort}
        onChange={(e) => update('sort', e.target.value as FindingSortOrder)}
        aria-label="Sort order"
        className="w-auto min-w-[150px]"
      >
        <option value="risk">Highest risk first</option>
        <option value="dueDate">Due soonest</option>
        <option value="newest">Newest first</option>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" onClick={() => onChange(DEFAULT_FINDING_FILTERS)} className="px-2.5">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
