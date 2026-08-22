import type { FindingFormValues } from './findingTypes';

export type FindingFormErrors = Partial<Record<keyof FindingFormValues, string>>;

export const EMPTY_FINDING_FORM_VALUES: FindingFormValues = {
  title: '',
  description: '',
  workplace: '',
  department: '',
  location: '',
  riskLevel: '',
  dueDate: '',
  createdBy: '',
  assignedTo: '',
};

export function validateFindingForm(values: FindingFormValues): FindingFormErrors {
  const errors: FindingFormErrors = {};

  if (!values.title.trim()) errors.title = 'Title is required.';
  else if (values.title.trim().length > 160) errors.title = 'Title must be 160 characters or fewer.';

  if (!values.description.trim()) errors.description = 'Description is required.';
  if (!values.workplace.trim()) errors.workplace = 'Workplace is required.';
  if (!values.department.trim()) errors.department = 'Department is required.';
  if (!values.location.trim()) errors.location = 'Specific location is required.';
  if (!values.riskLevel) errors.riskLevel = 'Select a risk level.';
  if (!values.dueDate) errors.dueDate = 'Select a due date.';
  if (!values.createdBy.trim()) errors.createdBy = 'Creator name is required.';

  return errors;
}
