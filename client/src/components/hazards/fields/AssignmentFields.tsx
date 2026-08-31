import { FormField } from '../../form/FormField';
import { Input } from '../../form/Input';
import { Select } from '../../form/Select';
import { useAuth } from '../../../lib/AuthContext';
import { useUsers } from '../../../lib/useUsers';
import { canTriageHazard } from '../../../lib/roles';
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
  // Assigning ownership during initial reporting is a triage action — a Worker reports the
  // hazard and Supervisor/EHS/Admin assign it afterward, not the other way around.
  const canAssign = Boolean(user && canTriageHazard(user.role));

  return (
    <div className={`grid grid-cols-1 gap-4 ${canAssign ? 'sm:grid-cols-2' : ''}`}>
      <FormField label="Reported By" htmlFor="reportedBy" required error={errors.reportedBy} hint="You, from your signed-in account.">
        <Input id="reportedBy" value={values.reportedBy || user?.name || ''} disabled />
      </FormField>

      {canAssign && (
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
      )}
    </div>
  );
}
