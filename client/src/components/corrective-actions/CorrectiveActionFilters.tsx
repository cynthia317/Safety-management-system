import { Search, X } from 'lucide-react';
import { Input } from '../form/Input';
import { Select } from '../form/Select';
import { Button } from '../Button';
import { RISK_LEVELS } from '../../lib/hazardOptions';
import { CORRECTIVE_ACTION_STATUSES } from '../../lib/correctiveActionOptions';
import type { CorrectiveActionStatus } from '../../lib/correctiveActionTypes';
import type { RiskLevel } from '../../lib/hazardTypes';

export type CorrectiveActionSortOrder = 'priority' | 'dueDate' | 'newest';

export interface CorrectiveActionFiltersState {
  search: string;
  priority: RiskLevel | 'all';
  status: CorrectiveActionStatus | 'all';
  workplace: string | 'all';
  sort: CorrectiveActionSortOrder;
}

export const DEFAULT_CORRECTIVE_ACTION_FILTERS: CorrectiveActionFiltersState = {
  search: '',
  priority: 'all',
  status: 'all',
  workplace: 'all',
  sort: 'priority',
};

interface CorrectiveActionFiltersProps {
  value: CorrectiveActionFiltersState;
  onChange: (value: CorrectiveActionFiltersState) => void;
  workplaceOptions: string[];
}

export function CorrectiveActionFilters({ value, onChange, workplaceOptions }: CorrectiveActionFiltersProps) {
  const hasActiveFilters =
    value.search !== '' || value.priority !== 'all' || value.status !== 'all' || value.workplace !== 'all';

  function update<K extends keyof CorrectiveActionFiltersState>(key: K, next: CorrectiveActionFiltersState[K]) {
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
          aria-label="Search corrective actions"
        />
      </div>

      <Select
        value={value.priority}
        onChange={(e) => update('priority', e.target.value as CorrectiveActionFiltersState['priority'])}
        aria-label="Filter by priority"
        className="w-auto min-w-[130px]"
      >
        <option value="all">All Priorities</option>
        {RISK_LEVELS.map((level) => (
          <option key={level} value={level}>
            {level} Priority
          </option>
        ))}
      </Select>

      <Select
        value={value.status}
        onChange={(e) => update('status', e.target.value as CorrectiveActionFiltersState['status'])}
        aria-label="Filter by status"
        className="w-auto min-w-[160px]"
      >
        <option value="all">All Statuses</option>
        {CORRECTIVE_ACTION_STATUSES.map((status) => (
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
        onChange={(e) => update('sort', e.target.value as CorrectiveActionSortOrder)}
        aria-label="Sort order"
        className="w-auto min-w-[150px]"
      >
        <option value="priority">Highest priority first</option>
        <option value="dueDate">Due soonest</option>
        <option value="newest">Newest first</option>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" onClick={() => onChange(DEFAULT_CORRECTIVE_ACTION_FILTERS)} className="px-2.5">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
