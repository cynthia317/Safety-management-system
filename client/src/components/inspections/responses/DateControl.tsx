import { Input } from '../../form/Input';
import type { ResponseControlProps } from './types';

export function DateControl({ value, onChange, disabled }: ResponseControlProps) {
  return (
    <Input type="date" value={value} disabled={disabled} className="sm:max-w-xs" onChange={(e) => onChange(e.target.value)} />
  );
}
