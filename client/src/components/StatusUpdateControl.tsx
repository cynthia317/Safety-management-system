import { useState } from 'react';
import { Select } from './form/Select';
import { Button } from './Button';

interface StatusUpdateControlProps<T extends string> {
  current: T;
  statuses: T[];
  onUpdate: (status: T) => Promise<void>;
}

export function StatusUpdateControl<T extends string>({ current, statuses, onUpdate }: StatusUpdateControlProps<T>) {
  const [nextStatus, setNextStatus] = useState<T>(current);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function handleUpdate() {
    if (nextStatus === current) return;
    setSubmitting(true);
    setError(null);
    setConfirmed(false);

    try {
      await onUpdate(nextStatus);
      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <Select
        value={nextStatus}
        onChange={(e) => {
          setNextStatus(e.target.value as T);
          setConfirmed(false);
        }}
        aria-label="Change status"
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        loading={submitting}
        disabled={nextStatus === current}
        onClick={handleUpdate}
      >
        Update Status
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {confirmed && !error && <p className="text-xs text-emerald-400">Status updated.</p>}
    </div>
  );
}
