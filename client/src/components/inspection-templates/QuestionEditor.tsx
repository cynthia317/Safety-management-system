import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { FormField } from '../form/FormField';
import { Input } from '../form/Input';
import { Textarea } from '../form/Textarea';
import { Select } from '../form/Select';
import { Checkbox } from '../form/Checkbox';
import { Button } from '../Button';
import { RESPONSE_TYPE_OPTIONS } from '../../lib/inspectionTemplateOptions';
import type { QuestionInput } from '../../lib/inspectionTemplateTypes';

interface QuestionEditorProps {
  question: QuestionInput;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (question: QuestionInput) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

export function QuestionEditor({
  question,
  index,
  canMoveUp,
  canMoveDown,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: QuestionEditorProps) {
  function setField<K extends keyof QuestionInput>(key: K, value: QuestionInput[K]) {
    onChange({ ...question, [key]: value });
  }

  return (
    <div className="rounded-md border border-border bg-canvas-raised p-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[11px] font-semibold text-muted">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <FormField label="Question Text" htmlFor={`q-${index}-text`} required>
            <Input
              id={`q-${index}-text`}
              value={question.text}
              placeholder="e.g. Are fire extinguishers present and in date?"
              onChange={(e) => setField('text', e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Guidance" htmlFor={`q-${index}-guidance`} hint="Optional — helps the inspector answer consistently.">
              <Textarea
                id={`q-${index}-guidance`}
                rows={2}
                value={question.guidance}
                onChange={(e) => setField('guidance', e.target.value)}
              />
            </FormField>
            <FormField label="Reference / Legal Note" htmlFor={`q-${index}-reference`} hint="Optional — standard or regulation reference.">
              <Textarea
                id={`q-${index}-reference`}
                rows={2}
                value={question.referenceNote}
                onChange={(e) => setField('referenceNote', e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Response Type" htmlFor={`q-${index}-type`}>
              <Select
                id={`q-${index}-type`}
                value={question.responseType}
                onChange={(e) => setField('responseType', e.target.value as QuestionInput['responseType'])}
              >
                {RESPONSE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </FormField>

            {question.responseType === 'multiple_choice' && (
              <FormField label="Options" htmlFor={`q-${index}-options`} hint="Comma-separated list of choices.">
                <Input
                  id={`q-${index}-options`}
                  value={question.options.join(', ')}
                  placeholder="e.g. Excellent, Good, Fair, Poor"
                  onChange={(e) =>
                    setField(
                      'options',
                      e.target.value.split(',').map((o) => o.trim()).filter(Boolean),
                    )
                  }
                />
              </FormField>
            )}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-3">
            <Checkbox
              id={`q-${index}-required`}
              label="Required"
              checked={question.required}
              onChange={(e) => setField('required', e.target.checked)}
            />
            <Checkbox
              id={`q-${index}-evidence`}
              label="Evidence required"
              checked={question.evidenceRequired}
              onChange={(e) => setField('evidenceRequired', e.target.checked)}
            />
            <Checkbox
              id={`q-${index}-finding`}
              label="Allow finding creation"
              checked={question.allowFindingCreation}
              onChange={(e) => setField('allowFindingCreation', e.target.checked)}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <Button variant="ghost" className="h-7 w-7 p-0" disabled={!canMoveUp} onClick={onMoveUp} aria-label="Move question up">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="h-7 w-7 p-0" disabled={!canMoveDown} onClick={onMoveDown} aria-label="Move question down">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10" onClick={onDelete} aria-label="Delete question">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
