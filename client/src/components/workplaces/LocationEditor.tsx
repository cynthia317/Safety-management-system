import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { FormField } from '../form/FormField';
import { Input } from '../form/Input';
import { Button } from '../Button';
import type { LocationInput } from '../../lib/workplaceTypes';

interface LocationEditorProps {
  location: LocationInput;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (location: LocationInput) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

export function LocationEditor({
  location,
  index,
  canMoveUp,
  canMoveDown,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: LocationEditorProps) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-surface p-2.5">
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
        <FormField label="Specific Location" htmlFor={`loc-${index}-name`} required>
          <Input
            id={`loc-${index}-name`}
            value={location.name}
            placeholder="e.g. Dock 3, Server Room, Assembly Line 1"
            onChange={(e) => onChange({ ...location, name: e.target.value })}
          />
        </FormField>
        <FormField label="Description" htmlFor={`loc-${index}-description`} hint="Optional.">
          <Input
            id={`loc-${index}-description`}
            value={location.description}
            onChange={(e) => onChange({ ...location, description: e.target.value })}
          />
        </FormField>
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        <Button variant="ghost" className="h-7 w-7 p-0" disabled={!canMoveUp} onClick={onMoveUp} aria-label="Move location up">
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button variant="ghost" className="h-7 w-7 p-0" disabled={!canMoveDown} onClick={onMoveDown} aria-label="Move location down">
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10" onClick={onDelete} aria-label="Delete location">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
