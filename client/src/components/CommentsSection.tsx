import { useState, type FormEvent } from 'react';
import { MessageSquare } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { Button } from './Button';
import { FormField } from './form/FormField';
import { Textarea } from './form/Textarea';
import { useAuth } from '../lib/AuthContext';

export interface CommentItem {
  id: string;
  author: string;
  message: string;
  createdAt: string;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface CommentsSectionProps {
  comments: CommentItem[];
  onAdd: (message: string) => Promise<void>;
}

export function CommentsSection({ comments, onAdd }: CommentsSectionProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) {
      setError('Comment cannot be empty.');
      return;
    }

    setSubmitting(true);
    setGeneralError(null);

    try {
      await onAdd(message.trim());
      setMessage('');
      setError(undefined);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Could not post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No comments yet" description="Be the first to add a note." />
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-md border border-border bg-canvas-raised p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-heading">{comment.author}</p>
                <p className="text-xs text-muted">{formatTimestamp(comment.createdAt)}</p>
              </div>
              <p className="mt-1 text-sm text-body">{comment.message}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-3 border-t border-border pt-4">
        {generalError && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {generalError}
          </div>
        )}
        <FormField label={`Commenting as ${user?.name ?? 'you'}`} htmlFor="comment-message" required error={error}>
          <Textarea
            id="comment-message"
            rows={2}
            value={message}
            invalid={!!error}
            placeholder="Add a note or update…"
            onChange={(e) => {
              setMessage(e.target.value);
              setError(undefined);
            }}
          />
        </FormField>
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" loading={submitting}>
            Post Comment
          </Button>
        </div>
      </form>
    </div>
  );
}
