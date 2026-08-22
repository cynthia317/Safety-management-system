import { forwardRef, type InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, id, className = '', ...props },
  ref,
) {
  return (
    <label htmlFor={id} className={`flex cursor-pointer items-center gap-2 text-sm text-body ${className}`}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="h-4 w-4 shrink-0 rounded border-border bg-surface text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        {...props}
      />
      {label}
    </label>
  );
});
