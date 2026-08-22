import { Info, Scale, ImagePlus } from 'lucide-react';
import { ResponseControl } from './responses/ResponseControl';
import { PotentialFindingForm } from './PotentialFindingForm';
import { FormField } from '../form/FormField';
import { Textarea } from '../form/Textarea';
import { Input } from '../form/Input';
import type { TemplateQuestion } from '../../lib/inspectionTemplateTypes';
import type { PotentialFinding } from '../../lib/inspectionTypes';

export interface QuestionDraft {
  value: string;
  notes: string;
  evidenceNote: string;
  potentialFinding: PotentialFinding | null;
}

interface QuestionCardProps {
  question: TemplateQuestion;
  number: number;
  draft: QuestionDraft;
  onUpdate: (update: Partial<QuestionDraft>) => void;
}

export function QuestionCard({ question, number, draft, onUpdate }: QuestionCardProps) {
  const showPotentialFinding =
    question.allowFindingCreation && question.responseType === 'compliance' && draft.value === 'Non-Compliant';

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-semibold text-muted">
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-heading">
            {question.text}
            {question.required && <span className="ml-1 text-accent">*</span>}
          </p>

          {question.guidance && (
            <div className="mt-1.5 flex items-start gap-1.5 text-xs text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{question.guidance}</span>
            </div>
          )}

          {question.referenceNote && (
            <div className="mt-1 flex items-start gap-1.5 text-xs text-muted">
              <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="italic">{question.referenceNote}</span>
            </div>
          )}

          <div className="mt-3">
            <ResponseControl question={question} value={draft.value} onChange={(value) => onUpdate({ value })} />
          </div>

          <div className="mt-3">
            <FormField label="Notes" htmlFor={`${question.id}-notes`}>
              <Textarea
                id={`${question.id}-notes`}
                rows={2}
                value={draft.notes}
                placeholder="Optional notes for this question"
                onChange={(e) => onUpdate({ notes: e.target.value })}
              />
            </FormField>
          </div>

          <div className="mt-3">
            <FormField
              label={question.evidenceRequired ? 'Evidence' : 'Evidence (optional)'}
              htmlFor={`${question.id}-evidence`}
              required={question.evidenceRequired}
            >
              <div className="relative">
                <ImagePlus className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  id={`${question.id}-evidence`}
                  value={draft.evidenceNote}
                  placeholder="Describe evidence collected (photo, document, etc.)"
                  className="pl-8"
                  onChange={(e) => onUpdate({ evidenceNote: e.target.value })}
                />
              </div>
            </FormField>
          </div>

          {showPotentialFinding && (
            <div className="mt-3">
              <PotentialFindingForm
                finding={draft.potentialFinding}
                onChange={(finding) => onUpdate({ potentialFinding: finding })}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
