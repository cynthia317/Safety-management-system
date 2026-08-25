import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import { RiskAssessmentBuilder } from '../components/risk-assessments/RiskAssessmentBuilder';
import type { RiskAssessmentMetaValues } from '../components/risk-assessments/RiskAssessmentMetaFields';
import { createRiskAssessment } from '../lib/riskAssessmentsApi';
import { getHazard } from '../lib/hazardsApi';
import { useToast } from '../lib/ToastContext';
import { useWorkplaceSuggestions } from '../lib/useWorkplaceSuggestions';
import type { AssessmentType, RiskAssessmentItemInput } from '../lib/riskAssessmentTypes';

interface HazardSource {
  id: string;
  referenceNumber: string;
}

export function NewRiskAssessmentPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { workplaces, departments } = useWorkplaceSuggestions();
  const [searchParams] = useSearchParams();
  const hazardId = searchParams.get('hazardId');

  const [hazardSource, setHazardSource] = useState<HazardSource | null>(null);
  const [initialMeta, setInitialMeta] = useState<Partial<RiskAssessmentMetaValues> | undefined>(undefined);
  const [loadingSource, setLoadingSource] = useState(Boolean(hazardId));

  useEffect(() => {
    if (!hazardId) return undefined;

    let cancelled = false;
    getHazard(hazardId)
      .then((hazard) => {
        if (cancelled) return;
        setHazardSource({ id: hazard.id, referenceNumber: hazard.referenceNumber });
        setInitialMeta({
          title: `Risk assessment for ${hazard.title}`,
          assessmentType: 'Post-Incident',
          workplace: hazard.workplace,
          department: hazard.department,
          location: hazard.location,
        });
      })
      .catch(() => {
        if (!cancelled) setHazardSource(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingSource(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hazardId]);

  async function handleSave(meta: RiskAssessmentMetaValues, items: RiskAssessmentItemInput[]) {
    const created = await createRiskAssessment({
      title: meta.title.trim(),
      assessmentType: meta.assessmentType as AssessmentType,
      description: meta.description.trim(),
      workplace: meta.workplace.trim(),
      department: meta.department.trim(),
      location: meta.location.trim(),
      hazardId: hazardSource?.id ?? null,
      hazardReferenceNumber: hazardSource?.referenceNumber ?? null,
      assessedBy: meta.assessedBy.trim(),
      assessmentDate: meta.assessmentDate,
      nextReviewDate: meta.nextReviewDate,
      items,
    });
    showToast('success', `Risk assessment "${created.title}" created as a draft.`);
    navigate(`/risk-assessments/${created.id}`);
  }

  if (loadingSource) {
    return <LoadingState label="Loading source details…" />;
  }

  return (
    <>
      <PageHeader
        title="New Risk Assessment"
        description={
          hazardSource
            ? `Assess risk following hazard report ${hazardSource.referenceNumber}. Saved as a draft until submitted for review.`
            : 'Score hazards using a likelihood x severity matrix. Saved as a draft until submitted for review.'
        }
      />
      <RiskAssessmentBuilder
        workplaceSuggestions={workplaces}
        departmentSuggestions={departments}
        initialMeta={initialMeta}
        saveLabel="Create Risk Assessment"
        onSave={handleSave}
        onCancel={() => navigate('/risk-assessments')}
      />
    </>
  );
}
