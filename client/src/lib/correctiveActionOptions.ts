import type { CorrectiveActionSourceType, CorrectiveActionStatus } from './correctiveActionTypes';

export const CORRECTIVE_ACTION_STATUSES: CorrectiveActionStatus[] = [
  'Assigned',
  'In Progress',
  'Awaiting Verification',
  'Verified',
  'Closed',
];

export const CORRECTIVE_ACTION_SOURCE_TYPES: CorrectiveActionSourceType[] = [
  'Hazard Report',
  'Inspection',
  'Finding',
  'Audit',
  'Risk Assessment',
  'Incident',
  'Manual Entry',
];

// Source types that don't have a live module in the app yet — linking to them is a
// free-text reference (e.g. "AUD-014") rather than a real clickable record.
export const EXTERNAL_ONLY_SOURCE_TYPES: CorrectiveActionSourceType[] = ['Audit', 'Risk Assessment', 'Incident'];
