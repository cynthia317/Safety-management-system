import type { HazardFormValues } from './hazardTypes';

export type HazardFormErrors = Partial<Record<keyof HazardFormValues, string>>;

export const EMPTY_HAZARD_FORM_VALUES: HazardFormValues = {
  title: '',
  description: '',
  reportType: '',
  hazardCategory: '',
  workplace: '',
  department: '',
  location: '',
  peopleAtRisk: '',
  immediateActionTaken: '',
  riskLevel: '',
  reportedBy: '',
  assignedTo: '',
};

export function validateHazardForm(values: HazardFormValues): HazardFormErrors {
  const errors: HazardFormErrors = {};

  if (!values.title.trim()) errors.title = 'Title is required.';
  else if (values.title.trim().length > 160) errors.title = 'Title must be 160 characters or fewer.';

  if (!values.description.trim())
    errors.description = 'Description is required — describe what was observed.';

  if (!values.reportType) errors.reportType = 'Select a report type.';
  if (!values.hazardCategory) errors.hazardCategory = 'Select a hazard category.';
  if (!values.workplace) errors.workplace = 'Workplace is required.';
  if (!values.department) errors.department = 'Department is required.';
  if (!values.location.trim()) errors.location = 'Specific location is required.';
  if (!values.peopleAtRisk.trim()) errors.peopleAtRisk = 'Describe who may be affected.';
  if (!values.riskLevel) errors.riskLevel = 'Select a risk level.';
  if (!values.reportedBy.trim()) errors.reportedBy = 'Reporter name is required.';

  return errors;
}

export const STEP_FIELDS = {
  details: ['reportType', 'title', 'description'] as const,
  location: ['workplace', 'department', 'location'] as const,
  risk: ['hazardCategory', 'riskLevel', 'peopleAtRisk', 'reportedBy'] as const,
};

export function hasErrorsForFields(
  errors: HazardFormErrors,
  fields: readonly (keyof HazardFormValues)[],
): boolean {
  return fields.some((field) => Boolean(errors[field]));
}
