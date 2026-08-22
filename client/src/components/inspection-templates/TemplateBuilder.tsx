import { useState } from 'react';
import { Plus } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { Button } from '../Button';
import { TemplateMetaFields, type TemplateMetaValues } from './TemplateMetaFields';
import { SectionEditor } from './SectionEditor';
import { ApiError } from '../../lib/api';
import type { InspectionTemplate, SectionInput } from '../../lib/inspectionTemplateTypes';

function newSection(order: number): SectionInput {
  return { title: '', description: '', order, questions: [] };
}

export interface TemplateBuilderErrors extends Partial<Record<keyof TemplateMetaValues, string>> {
  general?: string;
}

interface TemplateBuilderProps {
  initialTemplate?: InspectionTemplate;
  saveLabel: string;
  onSave: (meta: TemplateMetaValues, sections: SectionInput[]) => Promise<void>;
  onCancel: () => void;
}

export function TemplateBuilder({ initialTemplate, saveLabel, onSave, onCancel }: TemplateBuilderProps) {
  const [meta, setMeta] = useState<TemplateMetaValues>({
    name: initialTemplate?.name ?? '',
    code: initialTemplate?.code ?? '',
    description: initialTemplate?.description ?? '',
    category: initialTemplate?.category ?? '',
    applicableIndustries: initialTemplate?.applicableIndustries ?? [],
  });
  const [sections, setSections] = useState<SectionInput[]>(initialTemplate?.sections ?? []);
  const [errors, setErrors] = useState<TemplateBuilderErrors>({});
  const [saving, setSaving] = useState(false);

  function setMetaField<K extends keyof TemplateMetaValues>(key: K, value: TemplateMetaValues[K]) {
    setMeta((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function addSection() {
    setSections((prev) => [...prev, newSection(prev.length)]);
  }

  function updateSection(index: number, section: SectionInput) {
    setSections((prev) => prev.map((s, i) => (i === index ? section : s)));
  }

  function moveSection(index: number, direction: -1 | 1) {
    setSections((prev) => {
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

  function deleteSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const nextErrors: TemplateBuilderErrors = {};
    if (!meta.name.trim()) nextErrors.name = 'Template name is required.';
    if (!meta.code.trim()) nextErrors.code = 'Template code is required.';
    if (!meta.category) nextErrors.category = 'Select a category.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      await onSave(meta, sections);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(err.details as TemplateBuilderErrors);
      } else {
        setErrors({ general: err instanceof Error ? err.message : 'Something went wrong. Please try again.' });
      }
    } finally {
      setSaving(false);
    }
  }

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);

  return (
    <div className="space-y-4">
      {errors.general && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {errors.general}
        </div>
      )}

      <SectionCard title="Template Details" description="Name, code, category, and where this template applies.">
        <TemplateMetaFields values={meta} errors={errors} onChange={setMetaField} />
      </SectionCard>

      <SectionCard
        title="Sections & Questions"
        description={`${sections.length} section${sections.length === 1 ? '' : 's'} · ${totalQuestions} question${totalQuestions === 1 ? '' : 's'}`}
      >
        <div className="space-y-3">
          {sections.length === 0 ? (
            <p className="text-sm text-muted">No sections yet. Add one to start building the checklist.</p>
          ) : (
            sections.map((section, index) => (
              <SectionEditor
                key={index}
                section={section}
                index={index}
                canMoveUp={index > 0}
                canMoveDown={index < sections.length - 1}
                onChange={(s) => updateSection(index, s)}
                onMoveUp={() => moveSection(index, -1)}
                onMoveDown={() => moveSection(index, 1)}
                onDelete={() => deleteSection(index)}
              />
            ))
          )}
          <Button variant="secondary" onClick={addSection}>
            <Plus className="h-4 w-4" />
            Add Section
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
