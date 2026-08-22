export type TemplateStatus = 'Draft' | 'Active' | 'Archived';

export type TemplateCategory =
  | 'General Workplace Safety'
  | 'Fire Safety'
  | 'Electrical Safety'
  | 'Housekeeping'
  | 'Machinery Safety'
  | 'PPE'
  | 'Ergonomics'
  | 'Chemical Safety'
  | 'Emergency Preparedness'
  | 'Environmental Health and Safety'
  | 'Construction Safety'
  | 'Office Safety'
  | 'Healthcare Safety'
  | 'Laboratory Safety'
  | 'School Safety'
  | 'Retail Safety'
  | 'Hospitality Safety'
  | 'Vehicle and Transport Safety'
  | 'Contractor Safety'
  | 'Custom Inspection';

/**
 * Discriminated by this key so new response types can be added without
 * touching existing ones — each type is handled by its own response
 * control component on the frontend.
 */
export type QuestionResponseType =
  | 'compliance'
  | 'yes_no'
  | 'text'
  | 'number'
  | 'date'
  | 'multiple_choice'
  | 'rating'
  | 'risk_rating';

export interface TemplateQuestion {
  id: string;
  text: string;
  guidance: string;
  referenceNote: string;
  responseType: QuestionResponseType;
  /** Only used when responseType === 'multiple_choice'. */
  options: string[];
  required: boolean;
  evidenceRequired: boolean;
  allowFindingCreation: boolean;
  order: number;
}

export interface TemplateSection {
  id: string;
  title: string;
  description: string;
  order: number;
  questions: TemplateQuestion[];
}

export interface InspectionTemplate {
  id: string;
  name: string;
  code: string;
  description: string;
  category: TemplateCategory;
  applicableIndustries: string[];
  version: number;
  status: TemplateStatus;
  sections: TemplateSection[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionInput {
  id?: string;
  text: string;
  guidance: string;
  referenceNote: string;
  responseType: QuestionResponseType;
  options: string[];
  required: boolean;
  evidenceRequired: boolean;
  allowFindingCreation: boolean;
  order: number;
}

export interface SectionInput {
  id?: string;
  title: string;
  description: string;
  order: number;
  questions: QuestionInput[];
}

export interface CreateTemplateInput {
  name: string;
  code: string;
  description: string;
  category: TemplateCategory;
  applicableIndustries: string[];
  sections: SectionInput[];
}

export interface UpdateTemplateInput {
  name?: string;
  code?: string;
  description?: string;
  category?: TemplateCategory;
  applicableIndustries?: string[];
  status?: TemplateStatus;
  sections?: SectionInput[];
}
