import { AlertTriangle, MapPin } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { EmptyState } from '../EmptyState';
import type { Workplace } from '../../lib/workplaceTypes';

interface WorkplaceHierarchyViewProps {
  workplace: Workplace;
}

export function WorkplaceHierarchyView({ workplace }: WorkplaceHierarchyViewProps) {
  if (workplace.areas.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No areas yet"
        description="Edit this workplace to map its areas / departments and specific locations."
      />
    );
  }

  return (
    <div className="space-y-3">
      {workplace.areas
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((area) => (
          <SectionCard key={area.id} title={area.name} description={area.description || undefined}>
            {area.locations.length === 0 ? (
              <p className="text-xs italic text-muted">No specific locations mapped in this area.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {area.locations
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((location) => (
                    <li
                      key={location.id}
                      className="flex items-start gap-2 rounded-md border border-border bg-canvas-raised p-2.5"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-body">{location.name}</p>
                        {location.description && <p className="text-xs text-muted">{location.description}</p>}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </SectionCard>
        ))}
    </div>
  );
}
