import { Select } from '../form/Select';
import { RISK_SCALE } from '../../lib/riskMatrix';

interface RiskScaleSelectProps {
  id: string;
  value: number | null;
  labels: Record<number, string>;
  allowUnset?: boolean;
  onChange: (value: number | null) => void;
}

export function RiskScaleSelect({ id, value, labels, allowUnset, onChange }: RiskScaleSelectProps) {
  return (
    <Select
      id={id}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    >
      {allowUnset && <option value="">Not assessed</option>}
      {RISK_SCALE.map((score) => (
        <option key={score} value={score}>
          {score} &middot; {labels[score]}
        </option>
      ))}
    </Select>
  );
}
