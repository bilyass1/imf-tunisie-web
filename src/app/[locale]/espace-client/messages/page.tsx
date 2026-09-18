import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireClient } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import PortalShell from '@/components/portal/PortalShell';
import { clientNav } from '@/components/portal/clientNav';
import Conversation, { ConversationRefresh } from '@/components/portal/Conversation';

export default async function MessagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const user = await requireClient(locale);
  const messages = user.messages ?? [];

  return (
    <PortalShell
      locale={locale}
      title={dict.client.messages}
      userName={user.name}
      nav={clientNav(locale, dict)}
      active="messages"
      backLabel={dict.auth.backToSite}
      logoutLabel={dict.auth.logout}
    >
      <ConversationRefresh/>
      <Conversation messages={messages} clientName={user.name} locale={locale}/>
    </PortalShell>
  );
}
