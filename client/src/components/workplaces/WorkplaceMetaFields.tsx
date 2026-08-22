import { FormField } from '../form/FormField';
import { Input } from '../form/Input';
import { Textarea } from '../form/Textarea';
import { Select } from '../form/Select';
import { WORKPLACE_INDUSTRY_TAGS } from '../../lib/workplaceOptions';

export interface WorkplaceMetaValues {
  organisation: string;
  name: string;
  code: string;
  industry: string;
  address: string;
}

interface WorkplaceMetaFieldsProps {
  values: WorkplaceMetaValues;
  errors: Partial<Record<keyof WorkplaceMetaValues, string>>;
  organisationSuggestions: string[];
  onChange: <K extends keyof WorkplaceMetaValues>(key: K, value: WorkplaceMetaValues[K]) => void;
}

export function WorkplaceMetaFields({ values, errors, organisationSuggestions, onChange }: WorkplaceMetaFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Organisation"
          htmlFor="workplace-organisation"
          required
          error={errors.organisation}
          hint="The company or entity this site belongs to."
        >
          <Input
            id="workplace-organisation"
            list="workplace-organisation-suggestions"
            value={values.organisation}
            invalid={!!errors.organisation}
            placeholder="e.g. Meridian Manufacturing Ltd."
            onChange={(e) => onChange('organisation', e.target.value)}
          />
          <datalist id="workplace-organisation-suggestions">
            {organisationSuggestions.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </FormField>

        <FormField label="Workplace / Site Name" htmlFor="workplace-name" required error={errors.name}>
          <Input
            id="workplace-name"
            value={values.name}
            invalid={!!errors.name}
            placeholder="e.g. Main Plant, Head Office, Site 4"
            onChange={(e) => onChange('name', e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Code" htmlFor="workplace-code" hint="Optional short identifier, e.g. PLANT-01">
          <Input
            id="workplace-code"
            value={values.code}
            placeholder="e.g. PLANT-01"
            onChange={(e) => onChange('code', e.target.value.toUpperCase())}
          />
        </FormField>

        <FormField label="Industry / Type" htmlFor="workplace-industry" hint="Optional — closest match for this site.">
          <Select
            id="workplace-industry"
            value={values.industry}
            onChange={(e) => onChange('industry', e.target.value)}
          >
            <option value="">Select industry / type…</option>
            {WORKPLACE_INDUSTRY_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Address" htmlFor="workplace-address" hint="Optional — physical address or general location.">
        <Textarea
          id="workplace-address"
          rows={2}
          value={values.address}
          placeholder="e.g. Industrial Area, Plot 22, Nairobi"
          onChange={(e) => onChange('address', e.target.value)}
        />
      </FormField>
    </div>
  );
}
