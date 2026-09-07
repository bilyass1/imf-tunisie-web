import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireClient } from '@/lib/auth';
import { t, formatDate } from '@/lib/format';
import PortalShell from '@/components/portal/PortalShell';
import { clientNav } from '@/components/portal/clientNav';
import { IconDoc, IconDownload } from '@/components/Icons';

export default async function DocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const user = await requireClient(locale);
  const documents = user.documents ?? [];

  return (
    <PortalShell
      locale={locale}
      title={dict.client.documents}
      userName={user.name}
      nav={clientNav(locale, dict)}
      active="documents"
      backLabel={dict.auth.backToSite}
      logoutLabel={dict.auth.logout}
    >
      {documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-10 text-center text-ink/50">
          {dict.client.noLot}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {documents.map((doc) => (
            <li key={doc.id}>
              <a
                href={doc.href}
                className="group flex items-center gap-4 rounded-2xl border border-ink/8 bg-white p-5 transition hover:border-gold-300 hover:shadow-card"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sand text-gold-600">
                  <IconDoc className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-medium text-ink">{t(doc.label, locale)}</p>
                  <p className="mt-1 text-[12px] text-ink/45">
                    {(dict.client.kinds as Record<string, string>)[doc.kind] ?? doc.kind} · {formatDate(doc.date, locale)}
                  </p>
                </div>
                <IconDownload className="h-5 w-5 shrink-0 text-ink/30 transition group-hover:text-gold-600" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}
