import type { TemplateQuestion } from '../../../lib/inspectionTemplateTypes';

export interface ResponseControlProps {
  question: TemplateQuestion;
  value: string;
  onChange: (value: string) => void;
  /** True when the control is shown for illustration only (e.g. a template preview) and shouldn't accept input. */
  disabled?: boolean;
}
