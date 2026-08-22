import { RISK_LEVEL_STYLES } from '../../lib/riskMatrix';
import type { RiskLevel } from '../../lib/hazardTypes';

interface RiskMatrixBadgeProps {
  score: number;
  level: RiskLevel;
  label?: string;
}

export function RiskMatrixBadge({ score, level, label }: RiskMatrixBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-semibold ${RISK_LEVEL_STYLES[level]}`}
    >
      {label && <span className="font-normal opacity-80">{label}:</span>}
      {level} &middot; {score}
    </span>
  );
}
