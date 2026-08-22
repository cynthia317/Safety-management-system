import type { Inspection, PotentialFinding, QuestionResponse } from './inspectionTypes';
import type { TemplateQuestion } from './inspectionTemplateTypes';

export interface OverallProgress {
  answered: number;
  total: number;
  percent: number;
}

export type SectionCompletionState = 'not-started' | 'in-progress' | 'complete';

export interface SectionProgress {
  sectionId: string;
  title: string;
  answered: number;
  total: number;
  state: SectionCompletionState;
}

export interface ComplianceSummary {
  total: number;
  compliant: number;
  nonCompliant: number;
  observation: number;
  notApplicable: number;
}

export interface RiskSummary {
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
}

export interface PotentialFindingWithContext {
  finding: PotentialFinding;
  response: QuestionResponse;
  question: TemplateQuestion;
  sectionTitle: string;
}

function isAnswered(response: QuestionResponse | undefined): boolean {
  return Boolean(response && response.value.trim().length > 0);
}

/** Counts only questions marked required — matches what submission actually requires. */
export function computeOverallProgress(inspection: Pick<Inspection, 'templateSnapshot' | 'responses'>): OverallProgress {
  let total = 0;
  let answered = 0;

  for (const section of inspection.templateSnapshot.sections) {
    for (const question of section.questions) {
      if (!question.required) continue;
      total += 1;
      const response = inspection.responses.find((r) => r.questionId === question.id);
      if (isAnswered(response)) answered += 1;
    }
  }

  return { answered, total, percent: total === 0 ? 100 : Math.round((answered / total) * 100) };
}

export function computeSectionProgress(inspection: Pick<Inspection, 'templateSnapshot' | 'responses'>): SectionProgress[] {
  return inspection.templateSnapshot.sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((section) => {
      const requiredQuestions = section.questions.filter((question) => question.required);
      const total = requiredQuestions.length;
      const answered = requiredQuestions.filter((question) =>
        isAnswered(inspection.responses.find((r) => r.questionId === question.id)),
      ).length;

      const state: SectionCompletionState = answered === 0 ? 'not-started' : answered === total ? 'complete' : 'in-progress';

      return { sectionId: section.id, title: section.title, answered, total, state };
    });
}

export function computeComplianceSummary(inspection: Pick<Inspection, 'responses'>): ComplianceSummary {
  const summary: ComplianceSummary = { total: 0, compliant: 0, nonCompliant: 0, observation: 0, notApplicable: 0 };

  for (const response of inspection.responses) {
    if (response.responseType !== 'compliance') continue;
    summary.total += 1;
    if (response.value === 'Compliant') summary.compliant += 1;
    else if (response.value === 'Non-Compliant') summary.nonCompliant += 1;
    else if (response.value === 'Observation') summary.observation += 1;
    else if (response.value === 'Not Applicable') summary.notApplicable += 1;
  }

  return summary;
}

export function getPotentialFindings(
  inspection: Pick<Inspection, 'templateSnapshot' | 'responses'>,
): PotentialFindingWithContext[] {
  const results: PotentialFindingWithContext[] = [];
  const questionById = new Map<string, { question: TemplateQuestion; sectionTitle: string }>();

  for (const section of inspection.templateSnapshot.sections) {
    for (const question of section.questions) {
      questionById.set(question.id, { question, sectionTitle: section.title });
    }
  }

  for (const response of inspection.responses) {
    if (!response.potentialFinding) continue;
    const context = questionById.get(response.questionId);
    if (!context) continue;
    results.push({
      finding: response.potentialFinding,
      response,
      question: context.question,
      sectionTitle: context.sectionTitle,
    });
  }

  return results;
}

export interface MissingRequiredQuestion {
  questionId: string;
  sectionTitle: string;
  text: string;
}

export function getMissingRequiredQuestions(
  inspection: Pick<Inspection, 'templateSnapshot' | 'responses'>,
): MissingRequiredQuestion[] {
  const missing: MissingRequiredQuestion[] = [];

  for (const section of inspection.templateSnapshot.sections) {
    for (const question of section.questions) {
      if (!question.required) continue;
      const response = inspection.responses.find((r) => r.questionId === question.id);
      if (!isAnswered(response)) {
        missing.push({ questionId: question.id, sectionTitle: section.title, text: question.text });
      }
    }
  }

  return missing;
}

export function computeRiskSummary(inspection: Pick<Inspection, 'templateSnapshot' | 'responses'>): RiskSummary {
  const summary: RiskSummary = { Critical: 0, High: 0, Medium: 0, Low: 0 };

  for (const { finding } of getPotentialFindings(inspection)) {
    if (finding.status !== 'Potential') continue;
    summary[finding.riskLevel] += 1;
  }

  return summary;
}
