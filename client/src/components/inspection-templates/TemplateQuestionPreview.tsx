import { Info, Scale, ImagePlus } from 'lucide-react';
import { ResponseControl } from '../inspections/responses/ResponseControl';
import { FormField } from '../form/FormField';
import { Textarea } from '../form/Textarea';
import { Input } from '../form/Input';
import type { TemplateQuestion } from '../../lib/inspectionTemplateTypes';

interface TemplateQuestionPreviewProps {
  question: TemplateQuestion;
  number: number;
}

function noop() {
  // Preview only — nothing to record against a template.
}

/**
 * Renders a question exactly as it will appear during an inspection —
 * same response control, notes field, and evidence field — but disabled,
 * so browsing a template shows the real fillable spaces instead of a
 * plain text description of them.
 */
export function TemplateQuestionPreview({ question, number }: TemplateQuestionPreviewProps) {
  return (
    <div className="rounded-md border border-border bg-canvas-raised p-4">
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
            <ResponseControl question={question} value="" onChange={noop} disabled />
          </div>

          <div className="mt-3">
            <FormField label="Notes" htmlFor={`preview-${question.id}-notes`}>
              <Textarea
                id={`preview-${question.id}-notes`}
                rows={2}
                value=""
                disabled
                placeholder="Space for the inspector's notes"
                onChange={noop}
              />
            </FormField>
          </div>

          <div className="mt-3">
            <FormField
              label={question.evidenceRequired ? 'Evidence' : 'Evidence (optional)'}
              htmlFor={`preview-${question.id}-evidence`}
              required={question.evidenceRequired}
            >
              <div className="relative">
                <ImagePlus className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  id={`preview-${question.id}-evidence`}
                  value=""
                  disabled
                  placeholder="Space to describe evidence collected (photo, document, etc.)"
                  className="pl-8"
                  onChange={noop}
                />
              </div>
            </FormField>
          </div>
        </div>
      </div>
    </div>
  );
}
