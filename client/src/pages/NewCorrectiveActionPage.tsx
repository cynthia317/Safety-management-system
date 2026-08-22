import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import {
  CorrectiveActionForm,
  type CorrectiveActionSourceContext,
  type ValidatedCorrectiveActionFormData,
} from '../components/corrective-actions/CorrectiveActionForm';
import { createCorrectiveAction } from '../lib/correctiveActionsApi';
import { addFindingComment, getFinding } from '../lib/findingsApi';
import { addHazardComment, getHazard } from '../lib/hazardsApi';
import { getInspection } from '../lib/inspectionsApi';
import { useToast } from '../lib/ToastContext';
import type { CorrectiveActionFormValues, CorrectiveActionSourceType } from '../lib/correctiveActionTypes';

export function NewCorrectiveActionPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const findingId = searchParams.get('findingId');
  const hazardId = searchParams.get('hazardId');
  const inspectionId = searchParams.get('inspectionId');
  const questionId = searchParams.get('questionId');

  const [sourceContext, setSourceContext] = useState<CorrectiveActionSourceContext | null>(null);
  const [initialValues, setInitialValues] = useState<Partial<CorrectiveActionFormValues> | undefined>(undefined);
  const [loadingSource, setLoadingSource] = useState(Boolean(findingId || hazardId || inspectionId));

  useEffect(() => {
    if (findingId) {
      let cancelled = false;
      getFinding(findingId)
        .then((finding) => {
          if (cancelled) return;
          setSourceContext({ kind: 'finding', id: finding.id, referenceNumber: finding.referenceNumber, title: finding.title });
          setInitialValues({
            title: finding.title,
            workplace: finding.workplace,
            department: finding.department,
            location: finding.location,
            priority: finding.riskLevel,
            sourceType: 'Finding' as CorrectiveActionSourceType,
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

    if (hazardId) {
      let cancelled = false;
      getHazard(hazardId)
        .then((hazard) => {
          if (cancelled) return;
          setSourceContext({ kind: 'hazard', id: hazard.id, referenceNumber: hazard.referenceNumber, title: hazard.title });
          setInitialValues({
            title: hazard.title,
            workplace: hazard.workplace,
            department: hazard.department,
            location: hazard.location,
            priority: hazard.riskLevel,
            sourceType: 'Hazard Report' as CorrectiveActionSourceType,
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
            priority: finding?.riskLevel ?? '',
            sourceType: 'Inspection' as CorrectiveActionSourceType,
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
  }, [findingId, hazardId, inspectionId, questionId]);

  async function handleSubmit(data: ValidatedCorrectiveActionFormData) {
    const created = await createCorrectiveAction({
      title: data.title,
      description: data.description,
      workplace: data.workplace,
      department: data.department,
      location: data.location,
      priority: data.priority,
      dueDate: data.dueDate,
      createdBy: data.createdBy,
      assignedTo: data.assignedTo,
      sourceType: data.sourceType,
      findingId: sourceContext?.kind === 'finding' ? sourceContext.id : null,
      findingReferenceNumber: sourceContext?.kind === 'finding' ? sourceContext.referenceNumber : null,
      hazardId: sourceContext?.kind === 'hazard' ? sourceContext.id : null,
      hazardReferenceNumber: sourceContext?.kind === 'hazard' ? sourceContext.referenceNumber : null,
      inspectionId: sourceContext?.kind === 'inspection' ? sourceContext.id : null,
      inspectionReferenceNumber: sourceContext?.kind === 'inspection' ? sourceContext.referenceNumber : null,
      externalSourceReference: data.externalSourceReference || null,
    });

    if (sourceContext?.kind === 'finding') {
      try {
        await addFindingComment(sourceContext.id, {
          author: data.createdBy,
          message: `Created corrective action ${created.referenceNumber}: ${created.title}`,
        });
      } catch {
        // Best-effort cross-link note — don't block creation if this fails.
      }
    }

    if (sourceContext?.kind === 'hazard') {
      try {
        await addHazardComment(sourceContext.id, {
          author: data.createdBy,
          message: `Created corrective action ${created.referenceNumber}: ${created.title}`,
        });
      } catch {
        // Best-effort cross-link note — don't block creation if this fails.
      }
    }

    showToast('success', `Corrective action ${created.referenceNumber} created.`);
    navigate(`/corrective-actions/${created.id}`);
  }

  if (loadingSource) {
    return <LoadingState label="Loading source details…" />;
  }

  const sourceLabel = sourceContext ? { hazard: 'hazard report', finding: 'finding', inspection: 'inspection' }[sourceContext.kind] : null;

  return (
    <>
      <PageHeader
        title="New Corrective Action"
        description={
          sourceContext
            ? `Assign a fix for ${sourceLabel} ${sourceContext.referenceNumber}.`
            : 'Assign a fix to a responsible person and track it through verification.'
        }
      />
      <CorrectiveActionForm
        mode="create"
        initialValues={initialValues}
        sourceContext={sourceContext}
        submitLabel="Create Corrective Action"
        onSubmit={handleSubmit}
        onCancel={() => navigate('/corrective-actions')}
      />
    </>
  );
}
