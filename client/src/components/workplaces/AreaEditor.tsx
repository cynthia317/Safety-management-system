import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { FormField } from '../form/FormField';
import { Input } from '../form/Input';
import { Textarea } from '../form/Textarea';
import { Button } from '../Button';
import { LocationEditor } from './LocationEditor';
import type { AreaInput, LocationInput } from '../../lib/workplaceTypes';

function newLocation(order: number): LocationInput {
  return { name: '', description: '', order };
}

interface AreaEditorProps {
  area: AreaInput;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (area: AreaInput) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

export function AreaEditor({ area, index, canMoveUp, canMoveDown, onChange, onMoveUp, onMoveDown, onDelete }: AreaEditorProps) {
  function updateLocations(locations: LocationInput[]) {
    onChange({ ...area, locations });
  }

  function addLocation() {
    updateLocations([...area.locations, newLocation(area.locations.length)]);
  }

  function updateLocation(lIndex: number, location: LocationInput) {
    updateLocations(area.locations.map((l, i) => (i === lIndex ? location : l)));
  }

  function moveLocation(lIndex: number, direction: -1 | 1) {
    const next = [...area.locations];
    const target = lIndex + direction;
    if (target < 0 || target >= next.length) return;
    const a = next[lIndex];
    const b = next[target];
    if (!a || !b) return;
    next[lIndex] = b;
    next[target] = a;
    updateLocations(next);
  }

  function deleteLocation(lIndex: number) {
    updateLocations(area.locations.filter((_, i) => i !== lIndex));
  }

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-3">
          <FormField label="Area / Department / Unit" htmlFor={`area-${index}-name`} required>
            <Input
              id={`area-${index}-name`}
              value={area.name}
              placeholder="e.g. Production Floor, Finance Department, Warehouse B"
              onChange={(e) => onChange({ ...area, name: e.target.value })}
            />
          </FormField>
          <FormField label="Description" htmlFor={`area-${index}-description`} hint="Optional.">
            <Textarea
              id={`area-${index}-description`}
              rows={2}
              value={area.description}
              onChange={(e) => onChange({ ...area, description: e.target.value })}
            />
          </FormField>
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <Button variant="ghost" className="h-7 w-7 p-0" disabled={!canMoveUp} onClick={onMoveUp} aria-label="Move area up">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="h-7 w-7 p-0" disabled={!canMoveDown} onClick={onMoveDown} aria-label="Move area down">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10" onClick={onDelete} aria-label="Delete area">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-2 border-t border-border pt-3">
        {area.locations.length === 0 ? (
          <p className="text-xs italic text-muted">No specific locations in this area yet.</p>
        ) : (
          area.locations.map((location, lIndex) => (
            <LocationEditor
              key={lIndex}
              location={location}
              index={lIndex}
              canMoveUp={lIndex > 0}
              canMoveDown={lIndex < area.locations.length - 1}
              onChange={(l) => updateLocation(lIndex, l)}
              onMoveUp={() => moveLocation(lIndex, -1)}
              onMoveDown={() => moveLocation(lIndex, 1)}
              onDelete={() => deleteLocation(lIndex)}
            />
          ))
        )}
        <Button variant="secondary" className="text-xs" onClick={addLocation}>
          <Plus className="h-3.5 w-3.5" />
          Add Specific Location
        </Button>
      </div>
    </div>
  );
}
