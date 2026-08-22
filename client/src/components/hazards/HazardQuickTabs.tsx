import type { HazardReport } from '../../lib/hazardTypes';
import { isHazardOverdue } from '../../lib/hazardSla';
import type { HazardFiltersState } from './HazardFilters';
import { DEFAULT_HAZARD_FILTERS } from './HazardFilters';

export interface QuickTab {
  id: string;
  label: string;
  preset: Partial<Pick<HazardFiltersState, 'risk' | 'status' | 'assigned' | 'overdueOnly'>>;
}

export const QUICK_TABS: QuickTab[] = [
  { id: 'all', label: 'All', preset: {} },
  { id: 'critical', label: 'Critical', preset: { risk: 'Critical' } },
  { id: 'high', label: 'High Risk', preset: { risk: 'High' } },
  { id: 'new', label: 'New', preset: { status: 'New' } },
  { id: 'unassigned', label: 'Unassigned', preset: { assigned: 'unassigned' } },
  { id: 'overdue', label: 'Overdue', preset: { overdueOnly: true } },
  { id: 'action-required', label: 'Action Required', preset: { status: 'Action Required' } },
  { id: 'resolved', label: 'Resolved', preset: { status: 'Resolved' } },
];

function matchesTab(hazard: HazardReport, tab: QuickTab): boolean {
  if (tab.preset.risk && hazard.riskLevel !== tab.preset.risk) return false;
  if (tab.preset.status && hazard.status !== tab.preset.status) return false;
  if (tab.preset.assigned === 'unassigned' && hazard.assignedTo !== '') return false;
  if (tab.preset.overdueOnly && !isHazardOverdue(hazard)) return false;
  return true;
}

interface HazardQuickTabsProps {
  hazards: HazardReport[];
  activeTabId: string;
  onSelect: (tab: QuickTab) => void;
}

export function HazardQuickTabs({ hazards, activeTabId, onSelect }: HazardQuickTabsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {QUICK_TABS.map((tab) => {
        const count = hazards.filter((h) => matchesTab(h, tab)).length;
        const isActive = tab.id === activeTabId;
        const isOverdueTab = tab.id === 'overdue';

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab)}
            className={`shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
              isActive
                ? isOverdueTab
                  ? 'border-red-500/40 bg-red-500/10 text-red-400'
                  : 'border-accent/40 bg-accent/10 text-accent'
                : isOverdueTab && count > 0
                  ? 'border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10'
                  : 'border-border bg-surface text-body hover:bg-surface-hover hover:text-heading'
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 ${isActive ? (isOverdueTab ? 'text-red-400/70' : 'text-accent/70') : isOverdueTab && count > 0 ? 'text-red-400/70' : 'text-muted'}`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function filtersForTab(tab: QuickTab): HazardFiltersState {
  return {
    ...DEFAULT_HAZARD_FILTERS,
    risk: tab.preset.risk ?? 'all',
    status: tab.preset.status ?? 'all',
    assigned: tab.preset.assigned ?? 'all',
    overdueOnly: tab.preset.overdueOnly ?? false,
  };
}

export function activeTabIdForFilters(filters: HazardFiltersState): string {
  const match = QUICK_TABS.find((tab) => {
    const preset = filtersForTab(tab);
    return (
      preset.risk === filters.risk &&
      preset.status === filters.status &&
      preset.assigned === filters.assigned &&
      preset.overdueOnly === filters.overdueOnly &&
      filters.search === DEFAULT_HAZARD_FILTERS.search &&
      filters.workplace === DEFAULT_HAZARD_FILTERS.workplace &&
      filters.category === DEFAULT_HAZARD_FILTERS.category &&
      filters.dateRange === DEFAULT_HAZARD_FILTERS.dateRange
    );
  });
  return match?.id ?? '';
}
