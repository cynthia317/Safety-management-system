import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { EmptyState } from '../components/EmptyState';

interface PlaceholderPageProps {
  title: string;
  icon: LucideIcon;
}

export function PlaceholderPage({ title, icon }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description="Part of the OSH Safety Management System." />
      <SectionCard title={title}>
        <EmptyState
          icon={icon}
          title="Module coming next"
          description={`The ${title} module is planned and will be built in an upcoming phase of the implementation plan.`}
        />
      </SectionCard>
    </>
  );
}
