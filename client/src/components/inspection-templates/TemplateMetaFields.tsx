import { useState } from 'react';
import { X } from 'lucide-react';
import { FormField } from '../form/FormField';
import { Input } from '../form/Input';
import { Textarea } from '../form/Textarea';
import { Select } from '../form/Select';
import { TEMPLATE_CATEGORIES, INDUSTRY_TAGS } from '../../lib/inspectionTemplateOptions';
import type { TemplateCategory } from '../../lib/inspectionTemplateTypes';

export interface TemplateMetaValues {
  name: string;
  code: string;
  description: string;
  category: TemplateCategory | '';
  applicableIndustries: string[];
}

interface TemplateMetaFieldsProps {
  values: TemplateMetaValues;
  errors: Partial<Record<keyof TemplateMetaValues, string>>;
  onChange: <K extends keyof TemplateMetaValues>(key: K, value: TemplateMetaValues[K]) => void;
}

export function TemplateMetaFields({ values, errors, onChange }: TemplateMetaFieldsProps) {
  const [customTag, setCustomTag] = useState('');

  function toggleIndustry(tag: string) {
    const has = values.applicableIndustries.includes(tag);
    onChange(
      'applicableIndustries',
      has ? values.applicableIndustries.filter((t) => t !== tag) : [...values.applicableIndustries, tag],
    );
  }

  function addCustomTag() {
    const tag = customTag.trim();
    if (!tag || values.applicableIndustries.includes(tag)) return;
    onChange('applicableIndustries', [...values.applicableIndustries, tag]);
    setCustomTag('');
  }

  const extraTags = values.applicableIndustries.filter((t) => !INDUSTRY_TAGS.includes(t));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Template Name" htmlFor="template-name" required error={errors.name}>
          <Input
            id="template-name"
            value={values.name}
            invalid={!!errors.name}
            placeholder="e.g. General Workplace Safety Inspection"
            onChange={(e) => onChange('name', e.target.value)}
          />
        </FormField>
        <FormField label="Code" htmlFor="template-code" required error={errors.code} hint="Short identifier, e.g. GWS-01">
          <Input
            id="template-code"
            value={values.code}
            invalid={!!errors.code}
            placeholder="e.g. GWS-01"
            onChange={(e) => onChange('code', e.target.value.toUpperCase())}
          />
        </FormField>
        <FormField label="Category" htmlFor="template-category" required error={errors.category}>
          <Select
            id="template-category"
            value={values.category}
            invalid={!!errors.category}
            onChange={(e) => onChange('category', e.target.value as TemplateCategory)}
          >
            <option value="">Select category…</option>
            {TEMPLATE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Description" htmlFor="template-description">
        <Textarea
          id="template-description"
          rows={2}
          value={values.description}
          placeholder="What this template covers and when to use it."
          onChange={(e) => onChange('description', e.target.value)}
        />
      </FormField>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          Applicable Workplace Types <span className="normal-case text-muted">(optional)</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {INDUSTRY_TAGS.map((tag) => {
            const isActive = values.applicableIndustries.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleIndustry(tag)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                  isActive
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-border bg-surface text-body hover:bg-surface-hover'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {extraTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {extraTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
              >
                {tag}
                <button type="button" onClick={() => toggleIndustry(tag)} aria-label={`Remove ${tag}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 flex max-w-xs gap-1.5">
          <Input
            value={customTag}
            placeholder="Add a custom workplace type…"
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomTag();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
