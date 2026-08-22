import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { RiskAssessmentBuilder } from '../components/risk-assessments/RiskAssessmentBuilder';
import type { RiskAssessmentMetaValues } from '../components/risk-assessments/RiskAssessmentMetaFields';
import { createRiskAssessment } from '../lib/riskAssessmentsApi';
import { useToast } from '../lib/ToastContext';
import { useWorkplaceSuggestions } from '../lib/useWorkplaceSuggestions';
import type { AssessmentType, RiskAssessmentItemInput } from '../lib/riskAssessmentTypes';

export function NewRiskAssessmentPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { workplaces, departments } = useWorkplaceSuggestions();

  async function handleSave(meta: RiskAssessmentMetaValues, items: RiskAssessmentItemInput[]) {
    const created = await createRiskAssessment({
      title: meta.title.trim(),
      assessmentType: meta.assessmentType as AssessmentType,
      description: meta.description.trim(),
      workplace: meta.workplace.trim(),
      department: meta.department.trim(),
      location: meta.location.trim(),
      assessedBy: meta.assessedBy.trim(),
      assessmentDate: meta.assessmentDate,
      nextReviewDate: meta.nextReviewDate,
      items,
    });
    showToast('success', `Risk assessment "${created.title}" created as a draft.`);
    navigate(`/risk-assessments/${created.id}`);
  }

  return (
    <>
      <PageHeader
        title="New Risk Assessment"
        description="Score hazards using a likelihood x severity matrix. Saved as a draft until submitted for review."
      />
      <RiskAssessmentBuilder
        workplaceSuggestions={workplaces}
        departmentSuggestions={departments}
        saveLabel="Create Risk Assessment"
        onSave={handleSave}
        onCancel={() => navigate('/risk-assessments')}
      />
    </>
  );
}
