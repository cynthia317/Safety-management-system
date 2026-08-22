import type { CorrectiveActionFormValues } from './correctiveActionTypes';

export type CorrectiveActionFormErrors = Partial<Record<keyof CorrectiveActionFormValues, string>>;

export const EMPTY_CORRECTIVE_ACTION_FORM_VALUES: CorrectiveActionFormValues = {
  title: '',
  description: '',
  workplace: '',
  department: '',
  location: '',
  priority: '',
  dueDate: '',
  createdBy: '',
  assignedTo: '',
  sourceType: 'Manual Entry',
  externalSourceReference: '',
};

export function validateCorrectiveActionForm(values: CorrectiveActionFormValues): CorrectiveActionFormErrors {
  const errors: CorrectiveActionFormErrors = {};

  if (!values.title.trim()) errors.title = 'Title is required.';
  else if (values.title.trim().length > 160) errors.title = 'Title must be 160 characters or fewer.';

  if (!values.description.trim()) errors.description = 'Description is required.';
  if (!values.workplace.trim()) errors.workplace = 'Workplace is required.';
  if (!values.department.trim()) errors.department = 'Department is required.';
  if (!values.location.trim()) errors.location = 'Specific location is required.';
  if (!values.priority) errors.priority = 'Select a priority.';
  if (!values.dueDate) errors.dueDate = 'Select a due date.';
  if (!values.createdBy.trim()) errors.createdBy = 'Creator name is required.';
  if (!values.assignedTo.trim()) errors.assignedTo = 'A responsible person must be assigned.';

  return errors;
}
