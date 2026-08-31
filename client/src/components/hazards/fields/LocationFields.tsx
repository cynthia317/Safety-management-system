import { FormField } from '../../form/FormField';
import { Input } from '../../form/Input';
import { useWorkplaceSuggestions } from '../../../lib/useWorkplaceSuggestions';
import type { HazardFormValues } from '../../../lib/hazardTypes';
import type { HazardFormErrors } from '../../../lib/hazardValidation';

interface LocationFieldsProps {
  values: HazardFormValues;
  errors: HazardFormErrors;
  onFieldChange: <K extends keyof HazardFormValues>(key: K, value: HazardFormValues[K]) => void;
  /** When set, the caller's role is scoped to a single workplace (everyone except Admin) —
   * the field shows that workplace as fixed context instead of letting them pick one they
   * may not actually have access to. */
  lockedWorkplace?: string;
}

export function LocationFields({ values, errors, onFieldChange, lockedWorkplace }: LocationFieldsProps) {
  const { workplaces, departments } = useWorkplaceSuggestions();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <FormField
        label="Workplace"
        htmlFor="workplace"
        required
        error={errors.workplace}
        hint={lockedWorkplace !== undefined ? 'Your assigned workplace.' : 'Type your site, facility, or office name.'}
      >
        {lockedWorkplace !== undefined ? (
          <Input id="workplace" value={lockedWorkplace} disabled />
        ) : (
          <>
            <Input
              id="workplace"
              list="workplace-suggestions"
              value={values.workplace}
              invalid={!!errors.workplace}
              placeholder="e.g. Main Plant, Downtown Office, Site 4"
              onChange={(e) => onFieldChange('workplace', e.target.value)}
            />
            <datalist id="workplace-suggestions">
              {workplaces.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
          </>
        )}
      </FormField>

      <FormField
        label="Department"
        htmlFor="department"
        required
        error={errors.department}
        hint="Type the team, unit, or area."
      >
        <Input
          id="department"
          list="department-suggestions"
          value={values.department}
          invalid={!!errors.department}
          placeholder="e.g. Warehouse B, Kitchen, IT"
          onChange={(e) => onFieldChange('department', e.target.value)}
        />
        <datalist id="department-suggestions">
          {departments.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </FormField>

      <FormField
        label="Specific Location"
        htmlFor="location"
        required
        error={errors.location}
        hint="e.g. Near loading bay door 4"
      >
        <Input
          id="location"
          value={values.location}
          invalid={!!errors.location}
          placeholder="Specific area, equipment, or landmark"
          onChange={(e) => onFieldChange('location', e.target.value)}
        />
      </FormField>
    </div>
  );
}
