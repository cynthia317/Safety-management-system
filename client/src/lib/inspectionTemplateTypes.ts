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

export type InspectionTemplateActivityType = 'created' | 'status_change' | 'updated';

export interface InspectionTemplateActivityEntry {
  id: string;
  inspectionTemplateId: string;
  type: InspectionTemplateActivityType;
  message: string;
  actor: string;
  createdAt: string;
}

export interface InspectionTemplateDetail extends InspectionTemplate {
  activity: InspectionTemplateActivityEntry[];
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

export interface CreateTemplatePayload {
  name: string;
  code: string;
  description: string;
  category: TemplateCategory;
  applicableIndustries: string[];
  sections: SectionInput[];
}

export interface UpdateTemplatePayload {
  name?: string;
  code?: string;
  description?: string;
  category?: TemplateCategory;
  applicableIndustries?: string[];
  status?: TemplateStatus;
  sections?: SectionInput[];
}
