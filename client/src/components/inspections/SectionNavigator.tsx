import { Check } from 'lucide-react';
import type { SectionProgress } from '../../lib/inspectionProgress';

interface SectionNavigatorProps {
  sections: SectionProgress[];
  activeSectionId: string;
  onSelect: (sectionId: string) => void;
}

function StateIndicator({ state }: { state: SectionProgress['state'] }) {
  if (state === 'complete') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'in-progress') {
    return <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />;
  }
  return <span className="h-2 w-2 shrink-0 rounded-full border border-border" />;
}

export function SectionNavigator({ sections, activeSectionId, onSelect }: SectionNavigatorProps) {
  return (
    <>
      {/* Desktop: vertical list */}
      <nav className="hidden w-56 shrink-0 space-y-0.5 lg:block">
        {sections.map((section) => {
          const isActive = section.sectionId === activeSectionId;
          return (
            <button
              key={section.sectionId}
              type="button"
              onClick={() => onSelect(section.sectionId)}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                isActive ? 'bg-accent/10 font-medium text-accent' : 'text-body hover:bg-surface-hover hover:text-heading'
              }`}
            >
              <span className="truncate">{section.title}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {section.total > 0 && (
                  <span className="text-xs text-muted">
                    {section.answered}/{section.total}
                  </span>
                )}
                <StateIndicator state={section.state} />
              </span>
            </button>
          );
        })}
      </nav>

      {/* Mobile / tablet: horizontal scroller */}
      <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
        {sections.map((section) => {
          const isActive = section.sectionId === activeSectionId;
          return (
            <button
              key={section.sectionId}
              type="button"
              onClick={() => onSelect(section.sectionId)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                isActive
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-border bg-surface text-body hover:bg-surface-hover'
              }`}
            >
              <StateIndicator state={section.state} />
              {section.title}
              {section.total > 0 && <span className="text-xs text-muted">{section.answered}/{section.total}</span>}
            </button>
          );
        })}
      </nav>
    </>
  );
}
