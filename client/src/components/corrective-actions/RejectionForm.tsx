import { useState } from 'react';
import { SectionCard } from '../SectionCard';
import { Button } from '../Button';
import { FormField } from '../form/FormField';
import { Textarea } from '../form/Textarea';

interface RejectionFormProps {
  onSubmit: (reason: string) => Promise<void>;
  onCancel: () => void;
}

export function RejectionForm({ onSubmit, onCancel }: RejectionFormProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('Explain why this is being sent back.');
      return;
    }

    setSubmitting(true);
    setGeneralError(null);
    try {
      await onSubmit(reason.trim());
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Could not send back. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SectionCard title="Send Back" description="Explain what still needs to be addressed before this can be verified.">
      <div className="space-y-3">
        {generalError && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{generalError}</div>
        )}
        <FormField label="Reason" htmlFor="rejection-reason" required error={error}>
          <Textarea
            id="rejection-reason"
            rows={3}
            value={reason}
            invalid={!!error}
            placeholder="What still needs to be fixed or clarified?"
            onChange={(e) => {
              setReason(e.target.value);
              setError(undefined);
            }}
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" loading={submitting} onClick={handleSubmit}>
            Send Back
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
