import { getSession } from '@/lib/session';
import type { ReactNode } from 'react';
import { getClientRevision } from '@/lib/db';
import PublicContentRefresh from '@/components/site/PublicContentRefresh';

export default async function ClientLayout({children}: {children:ReactNode}) {
  const session=await getSession();
  return <><PublicContentRefresh initialRevision={session?await getClientRevision(session.sub):''} endpoint="/api/client-revision"/>{children}</>;
}
