import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className = '', rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`w-full resize-y rounded-md border bg-surface px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60 ${
        invalid
          ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/40'
          : 'border-border focus:border-accent/60 focus:ring-accent/30'
      } ${className}`}
      {...props}
    />
  );
});
