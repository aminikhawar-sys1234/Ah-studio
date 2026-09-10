import { type ReactNode } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary-100 mb-4">
          {icon ?? <Construction className="h-8 w-8 text-secondary-400" />}
        </div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-2">{title}</h3>
        <p className="text-sm text-secondary-500 max-w-md">
          This module is part of the AH Studio architecture and is ready for implementation.
          The database schema and API contracts are in place.
        </p>
      </div>
    </div>
  );
}
