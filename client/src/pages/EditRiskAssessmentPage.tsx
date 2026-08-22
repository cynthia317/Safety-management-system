import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { LoadingState } from '../components/LoadingState';
import { RiskAssessmentBuilder } from '../components/risk-assessments/RiskAssessmentBuilder';
import type { RiskAssessmentMetaValues } from '../components/risk-assessments/RiskAssessmentMetaFields';
import { getRiskAssessment, updateRiskAssessment } from '../lib/riskAssessmentsApi';
import { ApiError } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { useWorkplaceSuggestions } from '../lib/useWorkplaceSuggestions';
import type { AssessmentType, RiskAssessmentDetail, RiskAssessmentItemInput } from '../lib/riskAssessmentTypes';

export function EditRiskAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { workplaces, departments } = useWorkplaceSuggestions();

  const [assessment, setAssessment] = useState<RiskAssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    getRiskAssessment(id)
      .then((a) => setAssessment(a))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof Error ? err.message : 'Could not load risk assessment.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(meta: RiskAssessmentMetaValues, items: RiskAssessmentItemInput[]) {
    if (!assessment) return;
    const updated = await updateRiskAssessment(assessment.id, {
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
      actor: meta.assessedBy.trim(),
    });
    showToast('success', `Risk assessment "${updated.title}" saved.`);
    navigate(`/risk-assessments/${updated.id}`);
  }

  if (loading) return <LoadingState label="Loading risk assessment…" />;

  if (notFound) {
    return (
      <>
        <PageHeader title="Risk Assessment Not Found" />
        <EmptyState
          icon={AlertTriangle}
          title="No matching risk assessment"
          description={`No risk assessment exists for ID "${id}".`}
          action={
            <Link to="/risk-assessments">
              <Button variant="secondary" className="mt-2">
                Back to Risk Assessments
              </Button>
            </Link>
          }
        />
      </>
    );
  }

  if (error || !assessment) {
    return (
      <>
        <PageHeader title="Edit Risk Assessment" />
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load risk assessment"
          description={error ?? 'Something went wrong.'}
          action={
            <Button variant="secondary" className="mt-2" onClick={load}>
              Retry
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={`Edit ${assessment.title}`} description="Update assessment details and risk items." />
      <RiskAssessmentBuilder
        initialAssessment={assessment}
        workplaceSuggestions={workplaces}
        departmentSuggestions={departments}
        saveLabel="Save Changes"
        onSave={handleSave}
        onCancel={() => navigate(`/risk-assessments/${assessment.id}`)}
      />
    </>
  );
}
