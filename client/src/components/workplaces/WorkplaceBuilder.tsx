import { useState } from 'react';
import { Plus } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { Button } from '../Button';
import { WorkplaceMetaFields, type WorkplaceMetaValues } from './WorkplaceMetaFields';
import { AreaEditor } from './AreaEditor';
import { ApiError } from '../../lib/api';
import type { AreaInput, Workplace } from '../../lib/workplaceTypes';

function newArea(order: number): AreaInput {
  return { name: '', description: '', order, locations: [] };
}

export interface WorkplaceBuilderErrors extends Partial<Record<keyof WorkplaceMetaValues, string>> {
  general?: string;
}

interface WorkplaceBuilderProps {
  initialWorkplace?: Workplace;
  organisationSuggestions: string[];
  saveLabel: string;
  onSave: (meta: WorkplaceMetaValues, areas: AreaInput[]) => Promise<void>;
  onCancel: () => void;
}

export function WorkplaceBuilder({
  initialWorkplace,
  organisationSuggestions,
  saveLabel,
  onSave,
  onCancel,
}: WorkplaceBuilderProps) {
  const [meta, setMeta] = useState<WorkplaceMetaValues>({
    organisation: initialWorkplace?.organisation ?? '',
    name: initialWorkplace?.name ?? '',
    code: initialWorkplace?.code ?? '',
    industry: initialWorkplace?.industry ?? '',
    address: initialWorkplace?.address ?? '',
  });
  const [areas, setAreas] = useState<AreaInput[]>(initialWorkplace?.areas ?? []);
  const [errors, setErrors] = useState<WorkplaceBuilderErrors>({});
  const [saving, setSaving] = useState(false);

  function setMetaField<K extends keyof WorkplaceMetaValues>(key: K, value: WorkplaceMetaValues[K]) {
    setMeta((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function addArea() {
    setAreas((prev) => [...prev, newArea(prev.length)]);
  }

  function updateArea(index: number, area: AreaInput) {
    setAreas((prev) => prev.map((a, i) => (i === index ? area : a)));
  }

  function moveArea(index: number, direction: -1 | 1) {
    setAreas((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const a = next[index];
      const b = next[target];
      if (!a || !b) return prev;
      next[index] = b;
      next[target] = a;
      return next;
    });
  }

  function deleteArea(index: number) {
    setAreas((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const nextErrors: WorkplaceBuilderErrors = {};
    if (!meta.organisation.trim()) nextErrors.organisation = 'Organisation is required.';
    if (!meta.name.trim()) nextErrors.name = 'Workplace / site name is required.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      await onSave(meta, areas);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(err.details as WorkplaceBuilderErrors);
      } else {
        setErrors({ general: err instanceof Error ? err.message : 'Something went wrong. Please try again.' });
      }
    } finally {
      setSaving(false);
    }
  }

  const totalLocations = areas.reduce((sum, a) => sum + a.locations.length, 0);

  return (
    <div className="space-y-4">
      {errors.general && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {errors.general}
        </div>
      )}

      <SectionCard title="Workplace Details" description="Organisation and site identification.">
        <WorkplaceMetaFields
          values={meta}
          errors={errors}
          organisationSuggestions={organisationSuggestions}
          onChange={setMetaField}
        />
      </SectionCard>

      <SectionCard
        title="Areas & Specific Locations"
        description={`${areas.length} area${areas.length === 1 ? '' : 's'} · ${totalLocations} specific location${totalLocations === 1 ? '' : 's'}`}
      >
        <div className="space-y-3">
          {areas.length === 0 ? (
            <p className="text-sm text-muted">No areas yet. Add one to start mapping this site.</p>
          ) : (
            areas.map((area, index) => (
              <AreaEditor
                key={index}
                area={area}
                index={index}
                canMoveUp={index > 0}
                canMoveDown={index < areas.length - 1}
                onChange={(a) => updateArea(index, a)}
                onMoveUp={() => moveArea(index, -1)}
                onMoveDown={() => moveArea(index, 1)}
                onDelete={() => deleteArea(index)}
              />
            ))
          )}
          <Button variant="secondary" onClick={addArea}>
            <Plus className="h-4 w-4" />
            Add Area / Department / Unit
          </Button>
        </div>
      </SectionCard>

      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" loading={saving} onClick={handleSave}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
