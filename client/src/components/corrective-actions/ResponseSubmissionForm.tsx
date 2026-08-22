import { useState } from 'react';
import { SectionCard } from '../SectionCard';
import { Button } from '../Button';
import { FormField } from '../form/FormField';
import { Textarea } from '../form/Textarea';
import { Input } from '../form/Input';

interface ResponseSubmissionFormProps {
  onSubmit: (input: { responseNote: string; evidenceNote: string }) => Promise<void>;
  onCancel: () => void;
}

export function ResponseSubmissionForm({ onSubmit, onCancel }: ResponseSubmissionFormProps) {
  const [responseNote, setResponseNote] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [errors, setErrors] = useState<{ responseNote?: string; evidenceNote?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  async function handleSubmit() {
    const nextErrors: { responseNote?: string; evidenceNote?: string } = {};
    if (!responseNote.trim()) nextErrors.responseNote = 'Describe what was done to fix this.';
    if (!evidenceNote.trim()) nextErrors.evidenceNote = 'Describe the evidence collected.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setGeneralError(null);
    try {
      await onSubmit({ responseNote: responseNote.trim(), evidenceNote: evidenceNote.trim() });
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Could not submit response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SectionCard title="Submit Response" description="Describe the fix and attach evidence for the safety officer to verify.">
      <div className="space-y-3">
        {generalError && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{generalError}</div>
        )}
        <FormField label="Response" htmlFor="response-note" required error={errors.responseNote}>
          <Textarea
            id="response-note"
            rows={3}
            value={responseNote}
            invalid={!!errors.responseNote}
            placeholder="What was done to correct this?"
            onChange={(e) => {
              setResponseNote(e.target.value);
              setErrors((prev) => ({ ...prev, responseNote: undefined }));
            }}
          />
        </FormField>
        <FormField label="Evidence" htmlFor="response-evidence" required error={errors.evidenceNote}>
          <Input
            id="response-evidence"
            value={evidenceNote}
            invalid={!!errors.evidenceNote}
            placeholder="Describe evidence collected (photo, document, etc.)"
            onChange={(e) => {
              setEvidenceNote(e.target.value);
              setErrors((prev) => ({ ...prev, evidenceNote: undefined }));
            }}
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit}>
            Submit for Verification
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
