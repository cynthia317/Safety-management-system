import type { HazardCategory, HazardStatus, ReportType, RiskLevel } from './hazardTypes';

export const REPORT_TYPES: ReportType[] = [
  'Unsafe Condition',
  'Unsafe Act',
  'Near Miss',
  'Equipment Defect',
  'Environmental Concern',
  'Positive Safety Observation',
];

export const HAZARD_CATEGORIES: HazardCategory[] = [
  'Fire Safety',
  'Mechanical',
  'Electrical',
  'Chemical',
  'Slip, Trip & Fall',
  'Ergonomic',
  'PPE',
  'Environmental',
  'Other',
];

export const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];

export const RISK_RANK: Record<RiskLevel, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export const HAZARD_STATUSES: HazardStatus[] = [
  'New',
  'Under Review',
  'Action Required',
  'Resolved',
  'Closed',
];

export type DateRangeFilter = 'all' | 'today' | '7d' | '30d';

export const DATE_RANGE_OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];
