import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import { FindingForm, type FindingSourceContext, type ValidatedFindingFormData } from '../components/findings/FindingForm';
import { createFinding, createFindingFromInspectionResponse } from '../lib/findingsApi';
import { addHazardComment, getHazard } from '../lib/hazardsApi';
import { getInspection } from '../lib/inspectionsApi';
import { useToast } from '../lib/ToastContext';
import type { FindingFormValues } from '../lib/findingTypes';

export function NewFindingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const hazardId = searchParams.get('hazardId');
  const inspectionId = searchParams.get('inspectionId');
  const questionId = searchParams.get('questionId');

  const [sourceContext, setSourceContext] = useState<FindingSourceContext | null>(null);
  const [initialValues, setInitialValues] = useState<Partial<FindingFormValues> | undefined>(undefined);
  const [loadingSource, setLoadingSource] = useState(Boolean(hazardId || inspectionId));

  useEffect(() => {
    if (hazardId) {
      let cancelled = false;
      getHazard(hazardId)
        .then((hazard) => {
          if (cancelled) return;
          setSourceContext({ kind: 'hazard', id: hazard.id, referenceNumber: hazard.referenceNumber, title: hazard.title });
          setInitialValues({
            workplace: hazard.workplace,
            department: hazard.department,
            location: hazard.location,
            riskLevel: hazard.riskLevel,
          });
        })
        .catch(() => {
          if (!cancelled) setSourceContext(null);
        })
        .finally(() => {
          if (!cancelled) setLoadingSource(false);
        });
      return () => {
        cancelled = true;
      };
    }

    if (inspectionId) {
      let cancelled = false;
      getInspection(inspectionId)
        .then((inspection) => {
          if (cancelled) return;
          const response = questionId ? inspection.responses.find((r) => r.questionId === questionId) : undefined;
          const finding = response?.potentialFinding;

          setSourceContext({
            kind: 'inspection',
            id: inspection.id,
            referenceNumber: inspection.referenceNumber,
            title: inspection.title,
          });
          setInitialValues({
            title: finding?.title ?? '',
            description: finding?.description ?? '',
            workplace: inspection.workplace,
            department: inspection.area,
            location: inspection.specificLocation,
            riskLevel: finding?.riskLevel ?? '',
          });
        })
        .catch(() => {
          if (!cancelled) setSourceContext(null);
        })
        .finally(() => {
          if (!cancelled) setLoadingSource(false);
        });
      return () => {
        cancelled = true;
      };
    }

    return undefined;
  }, [hazardId, inspectionId, questionId]);

  async function handleSubmit(data: ValidatedFindingFormData) {
    if (sourceContext?.kind === 'inspection' && questionId) {
      // Transactional: the backend links Finding -> Inspection/QuestionResponse and flips
      // potentialFinding.status to 'Created' in one step — see
      // findingsApi.createFindingFromInspectionResponse.
      const created = await createFindingFromInspectionResponse(sourceContext.id, questionId, {
        title: data.title,
        description: data.description,
        riskLevel: data.riskLevel,
        assignedTo: data.assignedTo,
        dueDate: data.dueDate,
      });
      showToast('success', `Finding ${created.referenceNumber} created.`);
      navigate(`/findings/${created.id}`);
      return;
    }

    const created = await createFinding({
      ...data,
      hazardId: sourceContext?.kind === 'hazard' ? sourceContext.id : null,
      hazardReferenceNumber: sourceContext?.kind === 'hazard' ? sourceContext.referenceNumber : null,
      inspectionId: null,
      inspectionReferenceNumber: null,
    });

    if (sourceContext?.kind === 'hazard') {
      try {
        await addHazardComment(sourceContext.id, {
          author: data.createdBy,
          message: `Created finding ${created.referenceNumber}: ${created.title}`,
        });
      } catch {
        // Best-effort cross-link note — don't block finding creation if this fails.
      }
    }

    showToast('success', `Finding ${created.referenceNumber} created.`);
    navigate(`/findings/${created.id}`);
  }

  if (loadingSource) {
    return <LoadingState label="Loading source details…" />;
  }

  return (
    <>
      <PageHeader
        title="New Finding"
        description={
          sourceContext
            ? `Record a confirmed finding from ${sourceContext.kind === 'hazard' ? 'hazard report' : 'inspection'} ${sourceContext.referenceNumber}.`
            : 'Record a confirmed finding from a review or inspection.'
        }
      />
      <FindingForm
        mode="create"
        initialValues={initialValues}
        sourceContext={sourceContext}
        submitLabel="Create Finding"
        onSubmit={handleSubmit}
        onCancel={() => navigate('/findings')}
      />
    </>
  );
}
