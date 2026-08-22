import { FormField } from '../../form/FormField';
import { Input } from '../../form/Input';
import { Select } from '../../form/Select';
import { useAuth } from '../../../lib/AuthContext';
import { useUsers } from '../../../lib/useUsers';
import type { HazardFormValues } from '../../../lib/hazardTypes';
import type { HazardFormErrors } from '../../../lib/hazardValidation';

interface AssignmentFieldsProps {
  values: HazardFormValues;
  errors: HazardFormErrors;
  onFieldChange: <K extends keyof HazardFormValues>(key: K, value: HazardFormValues[K]) => void;
}

export function AssignmentFields({ values, errors, onFieldChange }: AssignmentFieldsProps) {
  const { user } = useAuth();
  const users = useUsers();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Reported By" htmlFor="reportedBy" required error={errors.reportedBy} hint="You, from your signed-in account.">
        <Input id="reportedBy" value={values.reportedBy || user?.name || ''} disabled />
      </FormField>

      <FormField label="Assigned Safety Officer" htmlFor="assignedTo" hint="Optional — can be assigned later.">
        <Select id="assignedTo" value={values.assignedTo} onChange={(e) => onFieldChange('assignedTo', e.target.value)}>
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.name}>
              {u.name} &middot; {u.role}
            </option>
          ))}
        </Select>
      </FormField>
    </div>
  );
}
