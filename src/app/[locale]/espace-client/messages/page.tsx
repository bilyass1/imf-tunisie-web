import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireClient } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import PortalShell from '@/components/portal/PortalShell';
import { clientNav } from '@/components/portal/clientNav';
import MessageForm from '@/components/portal/MessageForm';

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
      <div className="rounded-2xl border border-ink/8 bg-white p-6 lg:p-8">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-ink/45">{dict.client.messagesEmpty}</p>
        ) : (
          <ul className="space-y-5">
            {messages.map((m) => {
              const mine = m.from === 'client';
              return (
                <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${mine ? 'text-end' : ''}`}>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink/35">
                      {mine ? dict.client.you : dict.client.team} · {formatDate(m.date, locale)}
                    </p>
                    <div
                      className={`mt-2 rounded-2xl px-5 py-3.5 text-[14px] leading-relaxed ${
                        mine ? 'bg-ink text-white' : 'bg-sand/60 text-ink/80'
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-8 border-t border-ink/8 pt-6">
          <MessageForm placeholder={dict.client.writeMessage} send={dict.client.send} />
        </div>
      </div>
    </PortalShell>
  );
}
