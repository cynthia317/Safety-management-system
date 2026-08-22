import { PageHeader } from '../components/PageHeader';
import { HazardWizard } from '../components/hazards/HazardWizard';

export function NewHazardPage() {
  return (
    <>
      <PageHeader title="Report a Hazard" description="Report a workplace hazard, unsafe condition, or near miss." />
      <HazardWizard />
    </>
  );
}
