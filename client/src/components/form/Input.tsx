import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className = '', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-md border bg-surface px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60 ${
        invalid
          ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/40'
          : 'border-border focus:border-accent/60 focus:ring-accent/30'
      } ${className}`}
      {...props}
    />
  );
});
