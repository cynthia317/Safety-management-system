import type { ReactElement } from 'react';
import { ComplianceControl } from './ComplianceControl';
import { YesNoControl } from './YesNoControl';
import { TextControl } from './TextControl';
import { NumberControl } from './NumberControl';
import { DateControl } from './DateControl';
import { MultipleChoiceControl } from './MultipleChoiceControl';
import { RatingControl } from './RatingControl';
import { RiskRatingControl } from './RiskRatingControl';
import type { ResponseControlProps } from './types';
import type { QuestionResponseType } from '../../../lib/inspectionTemplateTypes';

/**
 * Central dispatch for response types. To add a new response type: add the
 * literal to QuestionResponseType, build a component matching
 * ResponseControlProps, and register it here — nothing else in the
 * inspection flow needs to change.
 */
const CONTROLS: Record<QuestionResponseType, (props: ResponseControlProps) => ReactElement> = {
  compliance: ComplianceControl,
  yes_no: YesNoControl,
  text: TextControl,
  number: NumberControl,
  date: DateControl,
  multiple_choice: MultipleChoiceControl,
  rating: RatingControl,
  risk_rating: RiskRatingControl,
};

export function ResponseControl(props: ResponseControlProps) {
  const Control = CONTROLS[props.question.responseType] ?? TextControl;
  return <Control {...props} />;
}
