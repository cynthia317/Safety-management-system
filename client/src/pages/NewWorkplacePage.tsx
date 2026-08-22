import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { WorkplaceBuilder } from '../components/workplaces/WorkplaceBuilder';
import type { WorkplaceMetaValues } from '../components/workplaces/WorkplaceMetaFields';
import { createWorkplace, listWorkplaces } from '../lib/workplacesApi';
import { useToast } from '../lib/ToastContext';
import type { AreaInput } from '../lib/workplaceTypes';

export function NewWorkplacePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [organisationSuggestions, setOrganisationSuggestions] = useState<string[]>([]);

  useEffect(() => {
    listWorkplaces()
      .then((all) => setOrganisationSuggestions(Array.from(new Set(all.map((w) => w.organisation))).sort()))
      .catch(() => setOrganisationSuggestions([]));
  }, []);

  async function handleSave(meta: WorkplaceMetaValues, areas: AreaInput[]) {
    const created = await createWorkplace({
      organisation: meta.organisation.trim(),
      name: meta.name.trim(),
      code: meta.code.trim(),
      industry: meta.industry.trim(),
      address: meta.address.trim(),
      areas,
    });
    showToast('success', `Workplace "${created.name}" created.`);
    navigate(`/workplaces/${created.id}`);
  }

  return (
    <>
      <PageHeader
        title="New Workplace"
        description="Register a site and map its areas, departments, and specific locations."
      />
      <WorkplaceBuilder
        organisationSuggestions={organisationSuggestions}
        saveLabel="Create Workplace"
        onSave={handleSave}
        onCancel={() => navigate('/workplaces')}
      />
    </>
  );
}
