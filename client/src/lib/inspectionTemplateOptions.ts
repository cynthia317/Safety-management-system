import type { QuestionResponseType, TemplateCategory, TemplateStatus } from './inspectionTemplateTypes';

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'General Workplace Safety',
  'Fire Safety',
  'Electrical Safety',
  'Housekeeping',
  'Machinery Safety',
  'PPE',
  'Ergonomics',
  'Chemical Safety',
  'Emergency Preparedness',
  'Environmental Health and Safety',
  'Construction Safety',
  'Office Safety',
  'Healthcare Safety',
  'Laboratory Safety',
  'School Safety',
  'Retail Safety',
  'Hospitality Safety',
  'Vehicle and Transport Safety',
  'Contractor Safety',
  'Custom Inspection',
];

export const TEMPLATE_STATUSES: TemplateStatus[] = ['Draft', 'Active', 'Archived'];

/**
 * Free-form tags describing the kinds of workplaces a template suits.
 * Deliberately broad and not tied to any one industry — new tags can be
 * typed in freely by the template author too.
 */
export const INDUSTRY_TAGS: string[] = [
  'Office',
  'School/University',
  'Hospital/Clinic',
  'Hotel/Hospitality',
  'Construction',
  'Manufacturing',
  'Warehouse',
  'Retail',
  'Workshop/Garage',
  'Laboratory',
  'Logistics',
  'Farm/Agriculture',
  'Residential/Commercial Property',
  'NGO',
  'SME',
  'Government',
  'Processing Plant',
  'Engineering',
];

export interface ResponseTypeOption {
  value: QuestionResponseType;
  label: string;
  description: string;
}

export const RESPONSE_TYPE_OPTIONS: ResponseTypeOption[] = [
  {
    value: 'compliance',
    label: 'Compliance',
    description: 'Compliant / Non-Compliant / Observation / Not Applicable',
  },
  { value: 'yes_no', label: 'Yes / No', description: 'A simple two-option question.' },
  { value: 'text', label: 'Text', description: 'Free-text written response.' },
  { value: 'number', label: 'Number', description: 'A numeric value, e.g. a reading or count.' },
  { value: 'date', label: 'Date', description: 'A calendar date, e.g. a certification expiry.' },
  { value: 'multiple_choice', label: 'Multiple Choice', description: 'One choice from a defined list of options.' },
  { value: 'rating', label: 'Rating', description: 'A 1–5 scale rating.' },
  { value: 'risk_rating', label: 'Risk Rating', description: 'Low / Medium / High / Critical.' },
];

export const RESPONSE_TYPE_LABELS: Record<QuestionResponseType, string> = RESPONSE_TYPE_OPTIONS.reduce(
  (acc, opt) => ({ ...acc, [opt.value]: opt.label }),
  {} as Record<QuestionResponseType, string>,
);
