export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

/** 1 (Rare) – 5 (Almost Certain). */
export const LIKELIHOOD_LABELS: Record<number, string> = {
  1: 'Rare',
  2: 'Unlikely',
  3: 'Possible',
  4: 'Likely',
  5: 'Almost Certain',
};

/** 1 (Negligible) – 5 (Catastrophic). */
export const SEVERITY_LABELS: Record<number, string> = {
  1: 'Negligible',
  2: 'Minor',
  3: 'Moderate',
  4: 'Major',
  5: 'Catastrophic',
};

export function isValidScale(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

/** Standard 5x5 matrix: likelihood x severity, 1-25. */
export function computeRiskScore(likelihood: number, severity: number): number {
  return likelihood * severity;
}

/** Banded to the same four levels used everywhere else in the app (RiskLevel). */
export function computeRiskLevel(score: number): RiskLevel {
  if (score >= 16) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
}

const LEVEL_RANK: Record<RiskLevel, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };

export function highestRiskLevel(levels: RiskLevel[]): RiskLevel {
  return levels.reduce<RiskLevel>((max, level) => (LEVEL_RANK[level] > LEVEL_RANK[max] ? level : max), 'Low');
}
