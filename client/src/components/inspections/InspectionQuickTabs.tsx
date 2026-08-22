import type { Inspection } from '../../lib/inspectionTypes';
import { DEFAULT_INSPECTION_FILTERS, type InspectionFiltersState } from './InspectionFilters';

export interface QuickTab {
  id: string;
  label: string;
  status: Inspection['status'] | 'all';
}

export const QUICK_TABS: QuickTab[] = [
  { id: 'all', label: 'All', status: 'all' },
  { id: 'draft', label: 'Draft', status: 'Draft' },
  { id: 'in-progress', label: 'In Progress', status: 'In Progress' },
  { id: 'submitted', label: 'Submitted', status: 'Submitted' },
  { id: 'reviewed', label: 'Reviewed', status: 'Reviewed' },
  { id: 'closed', label: 'Closed', status: 'Closed' },
];

interface InspectionQuickTabsProps {
  inspections: Inspection[];
  activeTabId: string;
  onSelect: (tab: QuickTab) => void;
}

export function InspectionQuickTabs({ inspections, activeTabId, onSelect }: InspectionQuickTabsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {QUICK_TABS.map((tab) => {
        const count = tab.status === 'all' ? inspections.length : inspections.filter((i) => i.status === tab.status).length;
        const isActive = tab.id === activeTabId;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab)}
            className={`shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
              isActive
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-border bg-surface text-body hover:bg-surface-hover hover:text-heading'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 ${isActive ? 'text-accent/70' : 'text-muted'}`}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export function filtersForTab(tab: QuickTab): InspectionFiltersState {
  return { ...DEFAULT_INSPECTION_FILTERS, status: tab.status };
}

export function activeTabIdForFilters(filters: InspectionFiltersState): string {
  const match = QUICK_TABS.find(
    (tab) =>
      tab.status === filters.status &&
      filters.search === DEFAULT_INSPECTION_FILTERS.search &&
      filters.templateId === DEFAULT_INSPECTION_FILTERS.templateId &&
      filters.workplace === DEFAULT_INSPECTION_FILTERS.workplace &&
      filters.inspector === DEFAULT_INSPECTION_FILTERS.inspector,
  );
  return match?.id ?? '';
}
