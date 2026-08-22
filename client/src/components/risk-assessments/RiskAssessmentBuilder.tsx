import { useState } from 'react';
import { Plus } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { Button } from '../Button';
import { RiskAssessmentMetaFields, type RiskAssessmentMetaValues } from './RiskAssessmentMetaFields';
import { RiskItemEditor } from './RiskItemEditor';
import { ApiError } from '../../lib/api';
import { toDateInputValue } from '../../lib/format';
import type { RiskAssessment, RiskAssessmentItemInput } from '../../lib/riskAssessmentTypes';

function newItem(order: number): RiskAssessmentItemInput {
  return {
    hazard: '',
    whoMightBeHarmed: '',
    existingControls: '',
    likelihood: 1,
    severity: 1,
    additionalControls: '',
    residualLikelihood: null,
    residualSeverity: null,
    order,
  };
}

export interface RiskAssessmentBuilderErrors extends Partial<Record<keyof RiskAssessmentMetaValues, string>> {
  general?: string;
}

interface RiskAssessmentBuilderProps {
  initialAssessment?: RiskAssessment;
  workplaceSuggestions: string[];
  departmentSuggestions: string[];
  saveLabel: string;
  onSave: (meta: RiskAssessmentMetaValues, items: RiskAssessmentItemInput[]) => Promise<void>;
  onCancel: () => void;
}

export function RiskAssessmentBuilder({
  initialAssessment,
  workplaceSuggestions,
  departmentSuggestions,
  saveLabel,
  onSave,
  onCancel,
}: RiskAssessmentBuilderProps) {
  const [meta, setMeta] = useState<RiskAssessmentMetaValues>({
    title: initialAssessment?.title ?? '',
    assessmentType: initialAssessment?.assessmentType ?? '',
    description: initialAssessment?.description ?? '',
    workplace: initialAssessment?.workplace ?? '',
    department: initialAssessment?.department ?? '',
    location: initialAssessment?.location ?? '',
    assessedBy: initialAssessment?.assessedBy ?? '',
    assessmentDate: initialAssessment ? toDateInputValue(initialAssessment.assessmentDate) : new Date().toISOString().slice(0, 10),
    nextReviewDate: initialAssessment?.nextReviewDate ? toDateInputValue(initialAssessment.nextReviewDate) : '',
  });
  const [items, setItems] = useState<RiskAssessmentItemInput[]>(
    initialAssessment?.items.map((i) => ({
      id: i.id,
      hazard: i.hazard,
      whoMightBeHarmed: i.whoMightBeHarmed,
      existingControls: i.existingControls,
      likelihood: i.likelihood,
      severity: i.severity,
      additionalControls: i.additionalControls,
      residualLikelihood: i.residualLikelihood,
      residualSeverity: i.residualSeverity,
      order: i.order,
    })) ?? [],
  );
  const [errors, setErrors] = useState<RiskAssessmentBuilderErrors>({});
  const [saving, setSaving] = useState(false);

  function setMetaField<K extends keyof RiskAssessmentMetaValues>(key: K, value: RiskAssessmentMetaValues[K]) {
    setMeta((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function addItem() {
    setItems((prev) => [...prev, newItem(prev.length)]);
  }

  function updateItem(index: number, item: RiskAssessmentItemInput) {
    setItems((prev) => prev.map((i, idx) => (idx === index ? item : i)));
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((prev) => {
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

  function deleteItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const nextErrors: RiskAssessmentBuilderErrors = {};
    if (!meta.title.trim()) nextErrors.title = 'Title is required.';
    if (!meta.assessmentType) nextErrors.assessmentType = 'Select an assessment type.';
    if (!meta.workplace.trim()) nextErrors.workplace = 'Workplace is required.';
    if (!meta.department.trim()) nextErrors.department = 'Area / department is required.';
    if (!meta.assessedBy.trim()) nextErrors.assessedBy = 'Assessed by is required.';
    if (!meta.assessmentDate) nextErrors.assessmentDate = 'Assessment date is required.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      await onSave(meta, items);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(err.details as RiskAssessmentBuilderErrors);
      } else {
        setErrors({ general: err instanceof Error ? err.message : 'Something went wrong. Please try again.' });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {errors.general && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {errors.general}
        </div>
      )}

      <SectionCard title="Assessment Details" description="What this risk assessment covers and who carried it out.">
        <RiskAssessmentMetaFields
          values={meta}
          errors={errors}
          workplaceSuggestions={workplaceSuggestions}
          departmentSuggestions={departmentSuggestions}
          onChange={setMetaField}
        />
      </SectionCard>

      <SectionCard
        title="Risk Items"
        description={`${items.length} item${items.length === 1 ? '' : 's'} — likelihood x severity, scored 1-25.`}
      >
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted">No risk items yet. Add one to start scoring hazards for this assessment.</p>
          ) : (
            items.map((item, index) => (
              <RiskItemEditor
                key={index}
                item={item}
                index={index}
                canMoveUp={index > 0}
                canMoveDown={index < items.length - 1}
                onChange={(i) => updateItem(index, i)}
                onMoveUp={() => moveItem(index, -1)}
                onMoveDown={() => moveItem(index, 1)}
                onDelete={() => deleteItem(index)}
              />
            ))
          )}
          <Button variant="secondary" onClick={addItem}>
            <Plus className="h-4 w-4" />
            Add Risk Item
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
