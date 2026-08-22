import { FormField } from '../form/FormField';
import { Input } from '../form/Input';
import { Textarea } from '../form/Textarea';
import { Select } from '../form/Select';
import { ASSESSMENT_TYPES } from '../../lib/riskAssessmentOptions';
import type { AssessmentType } from '../../lib/riskAssessmentTypes';

export interface RiskAssessmentMetaValues {
  title: string;
  assessmentType: AssessmentType | '';
  description: string;
  workplace: string;
  department: string;
  location: string;
  assessedBy: string;
  assessmentDate: string;
  nextReviewDate: string;
}

interface RiskAssessmentMetaFieldsProps {
  values: RiskAssessmentMetaValues;
  errors: Partial<Record<keyof RiskAssessmentMetaValues, string>>;
  workplaceSuggestions: string[];
  departmentSuggestions: string[];
  onChange: <K extends keyof RiskAssessmentMetaValues>(key: K, value: RiskAssessmentMetaValues[K]) => void;
}

export function RiskAssessmentMetaFields({
  values,
  errors,
  workplaceSuggestions,
  departmentSuggestions,
  onChange,
}: RiskAssessmentMetaFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Title" htmlFor="ra-title" required error={errors.title}>
          <Input
            id="ra-title"
            value={values.title}
            invalid={!!errors.title}
            placeholder="e.g. Press #3 Guarding and Pinch-Point Risk Assessment"
            onChange={(e) => onChange('title', e.target.value)}
          />
        </FormField>
        <FormField label="Assessment Type" htmlFor="ra-type" required error={errors.assessmentType}>
          <Select
            id="ra-type"
            value={values.assessmentType}
            invalid={!!errors.assessmentType}
            onChange={(e) => onChange('assessmentType', e.target.value as AssessmentType)}
          >
            <option value="">Select assessment type…</option>
            {ASSESSMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Description / Scope" htmlFor="ra-description" hint="Optional — what this assessment covers and why.">
        <Textarea
          id="ra-description"
          rows={2}
          value={values.description}
          placeholder="e.g. Covers pinch-point and entanglement risks on the Press #3 in-feed roller."
          onChange={(e) => onChange('description', e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Workplace" htmlFor="ra-workplace" required error={errors.workplace}>
          <Input
            id="ra-workplace"
            list="ra-workplace-suggestions"
            value={values.workplace}
            invalid={!!errors.workplace}
            placeholder="e.g. Main Plant"
            onChange={(e) => onChange('workplace', e.target.value)}
          />
          <datalist id="ra-workplace-suggestions">
            {workplaceSuggestions.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </FormField>
        <FormField label="Area / Department" htmlFor="ra-department" required error={errors.department}>
          <Input
            id="ra-department"
            list="ra-department-suggestions"
            value={values.department}
            invalid={!!errors.department}
            placeholder="e.g. Production Floor"
            onChange={(e) => onChange('department', e.target.value)}
          />
          <datalist id="ra-department-suggestions">
            {departmentSuggestions.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </FormField>
        <FormField label="Specific Location" htmlFor="ra-location" hint="Optional.">
          <Input
            id="ra-location"
            value={values.location}
            placeholder="e.g. Press #3, in-feed roller, Line 2"
            onChange={(e) => onChange('location', e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Assessed By" htmlFor="ra-assessed-by" required error={errors.assessedBy}>
          <Input
            id="ra-assessed-by"
            value={values.assessedBy}
            invalid={!!errors.assessedBy}
            placeholder="e.g. D. Brooks"
            onChange={(e) => onChange('assessedBy', e.target.value)}
          />
        </FormField>
        <FormField label="Assessment Date" htmlFor="ra-date" required error={errors.assessmentDate}>
          <Input
            id="ra-date"
            type="date"
            value={values.assessmentDate}
            invalid={!!errors.assessmentDate}
            onChange={(e) => onChange('assessmentDate', e.target.value)}
          />
        </FormField>
        <FormField label="Next Review Date" htmlFor="ra-next-review" hint="Optional.">
          <Input
            id="ra-next-review"
            type="date"
            value={values.nextReviewDate}
            onChange={(e) => onChange('nextReviewDate', e.target.value)}
          />
        </FormField>
      </div>
    </div>
  );
}
