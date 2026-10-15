import type { ReactNode } from 'react';
import { getPublicRevision } from '@/lib/db';
import PublicContentRefresh from '@/components/site/PublicContentRefresh';

export default async function ClientLayout({children}: {children:ReactNode}) {
  return <><PublicContentRefresh initialRevision={await getPublicRevision()}/>{children}</>;
}
