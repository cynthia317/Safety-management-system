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

interface HazardQuickTabsProps {
  activeTabId: string;
  onSelect: (tab: QuickTab) => void;
  /** Result count for whichever tab is currently active — sourced from the server-paginated
   * fetch's own total, since filtering now happens server-side rather than over a
   * client-held full table (each tab's own count would otherwise require its own query). */
  activeCount?: number;
}

export function HazardQuickTabs({ activeTabId, onSelect, activeCount }: HazardQuickTabsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {QUICK_TABS.map((tab) => {
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
                : 'border-border bg-surface text-body hover:bg-surface-hover hover:text-heading'
            }`}
          >
            {tab.label}
            {isActive && activeCount !== undefined && (
              <span className={`ml-1.5 ${isOverdueTab ? 'text-red-400/70' : 'text-accent/70'}`}>{activeCount}</span>
            )}
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
