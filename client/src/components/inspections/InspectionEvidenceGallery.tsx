import { Image } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import type { InspectionDetail } from '../../lib/inspectionTypes';

interface InspectionEvidenceGalleryProps {
  inspection: InspectionDetail;
}

export function InspectionEvidenceGallery({ inspection }: InspectionEvidenceGalleryProps) {
  const questionById = new Map<string, { text: string; sectionTitle: string }>();
  for (const section of inspection.templateSnapshot.sections) {
    for (const question of section.questions) {
      questionById.set(question.id, { text: question.text, sectionTitle: section.title });
    }
  }

  const evidenceItems = inspection.responses
    .filter((r) => r.evidenceNote.trim().length > 0)
    .map((r) => ({ response: r, question: questionById.get(r.questionId) }));

  if (evidenceItems.length === 0) {
    return (
      <EmptyState
        icon={Image}
        title="No evidence recorded"
        description="Evidence notes attached to questions during this inspection will appear here. Photo upload will be added in a future update."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {evidenceItems.map(({ response, question }, index) => (
        <div key={`${response.questionId}-${index}`} className="rounded-md border border-border bg-surface p-3.5">
          <div className="flex h-24 items-center justify-center rounded-md bg-surface-hover text-muted">
            <Image className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted">{question?.sectionTitle}</p>
          <p className="text-sm text-heading">{question?.text}</p>
          <p className="mt-1 text-xs text-body">{response.evidenceNote}</p>
        </div>
      ))}
    </div>
  );
}
