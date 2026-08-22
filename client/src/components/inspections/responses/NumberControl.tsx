import { Input } from '../../form/Input';
import type { ResponseControlProps } from './types';

export function NumberControl({ value, onChange, disabled }: ResponseControlProps) {
  return (
    <Input
      type="number"
      value={value}
      disabled={disabled}
      placeholder="Enter a number…"
      className="sm:max-w-xs"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
