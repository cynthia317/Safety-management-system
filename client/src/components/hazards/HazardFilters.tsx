import { Search, X } from 'lucide-react';
import { Input } from '../form/Input';
import { Select } from '../form/Select';
import { Button } from '../Button';
import { DATE_RANGE_OPTIONS, HAZARD_CATEGORIES, HAZARD_STATUSES, RISK_LEVELS } from '../../lib/hazardOptions';
import type { DateRangeFilter } from '../../lib/hazardOptions';
import type { HazardCategory, HazardStatus, RiskLevel } from '../../lib/hazardTypes';

export type SortOrder = 'risk' | 'newest' | 'oldest';

export interface HazardFiltersState {
  search: string;
  risk: RiskLevel | 'all';
  status: HazardStatus | 'all';
  workplace: string | 'all';
  category: HazardCategory | 'all';
  assigned: 'all' | 'unassigned';
  dateRange: DateRangeFilter;
  overdueOnly: boolean;
  sort: SortOrder;
}

export const DEFAULT_HAZARD_FILTERS: HazardFiltersState = {
  search: '',
  risk: 'all',
  status: 'all',
  workplace: 'all',
  category: 'all',
  assigned: 'all',
  dateRange: 'all',
  overdueOnly: false,
  sort: 'risk',
};

interface HazardFiltersProps {
  value: HazardFiltersState;
  onChange: (value: HazardFiltersState) => void;
  workplaceOptions: string[];
}

export function HazardFilters({ value, onChange, workplaceOptions }: HazardFiltersProps) {
  const hasActiveFilters =
    value.search !== '' ||
    value.risk !== 'all' ||
    value.status !== 'all' ||
    value.workplace !== 'all' ||
    value.category !== 'all' ||
    value.assigned !== 'all' ||
    value.dateRange !== 'all' ||
    value.overdueOnly;

  function update<K extends keyof HazardFiltersState>(key: K, next: HazardFiltersState[K]) {
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
          aria-label="Search hazard reports"
        />
      </div>

      <Select
        value={value.risk}
        onChange={(e) => update('risk', e.target.value as HazardFiltersState['risk'])}
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
        onChange={(e) => update('status', e.target.value as HazardFiltersState['status'])}
        aria-label="Filter by status"
        className="w-auto min-w-[140px]"
      >
        <option value="all">All Statuses</option>
        {HAZARD_STATUSES.map((status) => (
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
        value={value.category}
        onChange={(e) => update('category', e.target.value as HazardFiltersState['category'])}
        aria-label="Filter by category"
        className="w-auto min-w-[140px]"
      >
        <option value="all">All Categories</option>
        {HAZARD_CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </Select>

      <Select
        value={value.dateRange}
        onChange={(e) => update('dateRange', e.target.value as DateRangeFilter)}
        aria-label="Filter by date reported"
        className="w-auto min-w-[130px]"
      >
        {DATE_RANGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>

      <Select
        value={value.sort}
        onChange={(e) => update('sort', e.target.value as SortOrder)}
        aria-label="Sort order"
        className="w-auto min-w-[150px]"
      >
        <option value="risk">Highest risk first</option>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" onClick={() => onChange(DEFAULT_HAZARD_FILTERS)} className="px-2.5">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
