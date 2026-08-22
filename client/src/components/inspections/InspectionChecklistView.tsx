import { useState } from 'react';
import { EmptyState } from '../EmptyState';
import { ListFilter } from 'lucide-react';
import type { InspectionDetail } from '../../lib/inspectionTypes';

type ChecklistFilter = 'all' | 'Non-Compliant' | 'Observation' | 'Not Applicable';

const FILTERS: { value: ChecklistFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'Non-Compliant', label: 'Non-Compliant' },
  { value: 'Observation', label: 'Observations' },
  { value: 'Not Applicable', label: 'Not Applicable' },
];

const VALUE_STYLES: Record<string, string> = {
  Compliant: 'text-emerald-400',
  'Non-Compliant': 'text-red-400',
  Observation: 'text-amber-400',
  'Not Applicable': 'text-muted',
};

interface InspectionChecklistViewProps {
  inspection: InspectionDetail;
}

export function InspectionChecklistView({ inspection }: InspectionChecklistViewProps) {
  const [filter, setFilter] = useState<ChecklistFilter>('all');

  const sections = inspection.templateSnapshot.sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((section) => ({
      ...section,
      questions: section.questions
        .slice()
        .sort((a, b) => a.order - b.order)
        .filter((question) => {
          if (filter === 'all') return true;
          const response = inspection.responses.find((r) => r.questionId === question.id);
          return response?.value === filter;
        }),
    }))
    .filter((section) => section.questions.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <ListFilter className="h-3.5 w-3.5 text-muted" />
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
              filter === f.value
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-border bg-surface text-body hover:bg-surface-hover'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {sections.length === 0 ? (
        <EmptyState icon={ListFilter} title="No matching responses" description="No questions match this filter." />
      ) : (
        sections.map((section) => (
          <div key={section.id} className="rounded-md border border-border bg-surface">
            <div className="border-b border-border px-4 py-2.5">
              <h3 className="text-sm font-semibold text-heading">{section.title}</h3>
            </div>
            <div className="divide-y divide-border">
              {section.questions.map((question) => {
                const response = inspection.responses.find((r) => r.questionId === question.id);
                return (
                  <div key={question.id} className="px-4 py-3">
                    <p className="text-sm text-body">{question.text}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className={`font-medium ${VALUE_STYLES[response?.value ?? ''] ?? 'text-heading'}`}>
                        {response?.value || 'Not answered'}
                      </span>
                      {response?.notes && <span className="text-muted">Notes: {response.notes}</span>}
                      {response?.evidenceNote && <span className="text-muted">Evidence: {response.evidenceNote}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
