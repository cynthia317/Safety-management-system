import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import { HazardWizard, type HazardWizardSourceIncident } from '../components/hazards/HazardWizard';
import { getIncident } from '../lib/incidentsApi';
import type { HazardFormValues } from '../lib/hazardTypes';

export function NewHazardPage() {
  const [searchParams] = useSearchParams();
  const incidentId = searchParams.get('incidentId');

  const [sourceIncident, setSourceIncident] = useState<HazardWizardSourceIncident | null>(null);
  const [initialValues, setInitialValues] = useState<Partial<HazardFormValues> | undefined>(undefined);
  const [loadingSource, setLoadingSource] = useState(Boolean(incidentId));

  useEffect(() => {
    if (!incidentId) return undefined;

    let cancelled = false;
    getIncident(incidentId)
      .then((incident) => {
        if (cancelled) return;
        setSourceIncident({ id: incident.id, referenceNumber: incident.referenceNumber });
        setInitialValues({
          title: `Hazard identified during ${incident.referenceNumber}`,
          description: `Identified during the investigation of incident ${incident.referenceNumber} (${incident.title}).`,
          workplace: incident.workplace,
          department: incident.department,
          location: incident.location,
        });
      })
      .catch(() => {
        if (!cancelled) setSourceIncident(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingSource(false);
      });
    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  if (loadingSource) {
    return <LoadingState label="Loading incident details…" />;
  }

  return (
    <>
      <PageHeader
        title="Report a Hazard"
        description={
          sourceIncident
            ? `Report a hazard identified from incident ${sourceIncident.referenceNumber}.`
            : 'Report a workplace hazard or unsafe condition.'
        }
      />
      <HazardWizard initialValues={initialValues} sourceIncident={sourceIncident ?? undefined} />
    </>
  );
}
