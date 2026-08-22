import { useState } from 'react';
import { Button } from '../Button';
import { CorrectiveActionEvidenceGallery } from './CorrectiveActionEvidenceGallery';
import { CorrectiveActionEvidenceUpload, type PendingEvidence } from './CorrectiveActionEvidenceUpload';
import type { CorrectiveActionEvidenceItem } from '../../lib/correctiveActionTypes';

interface CorrectiveActionEvidencePanelProps {
  evidence: CorrectiveActionEvidenceItem[];
  onUpload: (files: PendingEvidence[]) => Promise<void>;
}

export function CorrectiveActionEvidencePanel({ evidence, onUpload }: CorrectiveActionEvidencePanelProps) {
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<PendingEvidence[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleUpload() {
    if (pending.length === 0) {
      setError('Attach at least one file.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onUpload(pending);
      setPending([]);
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload evidence.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {evidence.length} file{evidence.length === 1 ? '' : 's'} attached
        </p>
        {!adding && (
          <Button variant="secondary" className="text-xs" onClick={() => setAdding(true)}>
            Add Evidence
          </Button>
        )}
      </div>

      {adding && (
        <div className="space-y-3 rounded-md border border-border bg-surface p-3.5">
          <CorrectiveActionEvidenceUpload files={pending} onChange={setPending} />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setAdding(false);
                setPending([]);
                setError(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleUpload}>
              Upload
            </Button>
          </div>
        </div>
      )}

      <CorrectiveActionEvidenceGallery evidence={evidence} />
    </div>
  );
}
