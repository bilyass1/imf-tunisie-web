import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireAdminUser } from '@/lib/auth';
import { getClients, getProjects } from '@/lib/db';
import { formatMoney } from '@/lib/format';
import PortalShell from '@/components/portal/PortalShell';
import { adminNav } from '@/components/portal/clientNav';

export default async function AdminClientsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const user = await requireAdminUser(locale);

  const clients = (await getClients());
  const projectNames = new Map((await getProjects()).map((p) => [p.slug, p.name]));

  return (
    <PortalShell
      locale={locale}
      title={dict.admin.clientsTitle}
      userName={user.name}
      nav={adminNav(locale, dict)}
      active="clients"
      backLabel={dict.auth.backToSite}
      logoutLabel={dict.auth.logout}
      accent="admin"
    >
      {clients.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-12 text-center text-ink/50">
          {dict.admin.clientsEmpty}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/8 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13.5px]">
              <thead>
                <tr className="bg-sand/40 text-[11px] uppercase tracking-[0.1em] text-ink/50">
                  <th className="px-6 py-3 text-start font-semibold">{dict.admin.table.name}</th>
                  <th className="px-6 py-3 text-start font-semibold">{dict.admin.table.contact}</th>
                  <th className="px-6 py-3 text-start font-semibold">{dict.admin.table.project}</th>
                  <th className="px-6 py-3 text-start font-semibold">{dict.admin.table.lot}</th>
                  <th className="px-6 py-3 text-end font-semibold">{dict.client.summary.paid}</th>
                  <th className="px-6 py-3 text-end font-semibold">{dict.client.summary.remaining}</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const payments = c.payments ?? [];
                  const total = payments.reduce((s, p) => s + p.amount, 0);
                  const paid = payments.filter((p) => p.paid).reduce((s, p) => s + p.amount, 0);
                  return (
                    <tr key={c.id} className="border-t border-ink/6">
                      <td className="px-6 py-4 font-medium text-ink">{c.name}</td>
                      <td className="px-6 py-4 text-ink/55">
                        <a href={`mailto:${c.email}`} className="block hover:text-gold-600">
                          {c.email}
                        </a>
                        {c.phone && <span className="block text-ink/40">{c.phone}</span>}
                      </td>
                      <td className="px-6 py-4 text-ink/55">
                        {c.projectSlug ? (projectNames.get(c.projectSlug) ?? c.projectSlug) : '—'}
                      </td>
                      <td className="px-6 py-4 font-semibold text-ink">{c.lotRef ?? '—'}</td>
                      <td className="px-6 py-4 text-end text-emerald-600">{formatMoney(paid, locale)}</td>
                      <td className="px-6 py-4 text-end text-gold-600">{formatMoney(total - paid, locale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
