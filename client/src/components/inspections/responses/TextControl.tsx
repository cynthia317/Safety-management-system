import { Textarea } from '../../form/Textarea';
import type { ResponseControlProps } from './types';

export function TextControl({ value, onChange, disabled }: ResponseControlProps) {
  return (
    <Textarea
      rows={3}
      value={value}
      disabled={disabled}
      placeholder="Enter response…"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
