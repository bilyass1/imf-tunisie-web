import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireClient } from '@/lib/auth';
import { t, formatMoney, formatDate } from '@/lib/format';
import PortalShell from '@/components/portal/PortalShell';
import { clientNav } from '@/components/portal/clientNav';
import { IconCheck, IconClock } from '@/components/Icons';

export default async function PaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const user = await requireClient(locale);
  const payments = user.payments ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const paid = payments.filter((p) => p.paid).reduce((s, p) => s + p.amount, 0);

  return (
    <PortalShell
      locale={locale}
      title={dict.client.payments}
      userName={user.name}
      nav={clientNav(locale, dict)}
      active="payments"
      backLabel={dict.auth.backToSite}
      logoutLabel={dict.auth.logout}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: dict.client.summary.total, value: formatMoney(total, locale) },
          { label: dict.client.summary.paid, value: formatMoney(paid, locale), accent: 'text-emerald-600' },
          { label: dict.client.summary.remaining, value: formatMoney(total - paid, locale), accent: 'text-gold-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-ink/8 bg-white p-6">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink/40">{kpi.label}</p>
            <p className={`mt-3 font-display text-[26px] font-light leading-none ${kpi.accent ?? 'text-ink'}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink/8 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-[13.5px]">
            <thead>
              <tr className="bg-sand/40 text-[11px] uppercase tracking-[0.1em] text-ink/50">
                <th className="px-6 py-3 text-start font-semibold">{dict.client.paymentsTable.label}</th>
                <th className="px-6 py-3 text-start font-semibold">{dict.client.paymentsTable.due}</th>
                <th className="px-6 py-3 text-end font-semibold">{dict.client.paymentsTable.amount}</th>
                <th className="px-6 py-3 text-end font-semibold">{dict.client.paymentsTable.status}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const late = !p.paid && p.dueDate < today;
                return (
                  <tr key={p.id} className="border-t border-ink/6">
                    <td className="px-6 py-4 font-medium text-ink">{t(p.label, locale)}</td>
                    <td className="px-6 py-4 text-ink/60">{formatDate(p.dueDate, locale)}</td>
                    <td className="px-6 py-4 text-end font-semibold text-ink">{formatMoney(p.amount, locale)}</td>
                    <td className="px-6 py-4 text-end">
                      <span
                        className={`chip ${
                          p.paid
                            ? 'bg-emerald-50 text-emerald-700'
                            : late
                              ? 'bg-red-50 text-red-700'
                              : 'bg-sand text-ink/55'
                        }`}
                      >
                        {p.paid ? <IconCheck className="h-3 w-3" /> : <IconClock className="h-3 w-3" />}
                        {p.paid
                          ? dict.client.paymentsTable.paid
                          : late
                            ? dict.client.paymentsTable.late
                            : dict.client.paymentsTable.pending}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-ink/45">
                    {dict.client.noLot}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PortalShell>
  );
}
