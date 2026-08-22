import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { TemplateBuilder } from '../components/inspection-templates/TemplateBuilder';
import type { TemplateMetaValues } from '../components/inspection-templates/TemplateMetaFields';
import { createTemplate } from '../lib/inspectionTemplatesApi';
import { useToast } from '../lib/ToastContext';
import type { SectionInput, TemplateCategory } from '../lib/inspectionTemplateTypes';

export function NewInspectionTemplatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  async function handleSave(meta: TemplateMetaValues, sections: SectionInput[]) {
    const created = await createTemplate({
      name: meta.name.trim(),
      code: meta.code.trim(),
      description: meta.description.trim(),
      category: meta.category as TemplateCategory,
      applicableIndustries: meta.applicableIndustries,
      sections,
    });
    showToast('success', `Template "${created.name}" created as a draft.`);
    navigate(`/inspection-templates/${created.id}`);
  }

  return (
    <>
      <PageHeader
        title="New Inspection Template"
        description="Build a reusable checklist. It's saved as a draft until you activate it."
      />
      <TemplateBuilder saveLabel="Create Template" onSave={handleSave} onCancel={() => navigate('/inspection-templates')} />
    </>
  );
}
