import { paymentIsPaid, clientPaymentTotal, paymentPaidAmount, paymentSummary, paymentToday } from '@/lib/payments';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireClient } from '@/lib/auth';
import { getProjects } from '@/lib/db';
import { clientPaymentsForProperty, resolvedClientProperties, selectedClientProperty } from '@/lib/client-properties';
import { t, formatMoney, formatDate } from '@/lib/format';
import PortalShell from '@/components/portal/PortalShell';
import { clientNav } from '@/components/portal/clientNav';
import ClientPropertyTabs from '@/components/portal/ClientPropertyTabs';
import { IconCheck, IconClock } from '@/components/Icons';

export default async function PaymentsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ project?: string; lot?: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const user = await requireClient(locale);
  const properties=resolvedClientProperties(user,await getProjects());
  const selected=selectedClientProperty(properties,await searchParams);
  const payments=clientPaymentsForProperty(user,selected ? {projectSlug:selected.project.slug,lotRef:selected.lot.ref} : undefined);

  const today = paymentToday();
  const { total, paid, remaining } = paymentSummary(payments, clientPaymentTotal(user, selected ? {projectSlug:selected.project.slug,lotRef:selected.lot.ref} : undefined, selected?.lot.price));

  return (
    <PortalShell
      locale={locale}
      title={dict.client.payments}
      subtitle={selected ? `${selected.project.name} · ${selected.lot.code}` : undefined}
      userName={user.name}
      nav={clientNav(locale, dict,selected ? {projectSlug:selected.project.slug,lotRef:selected.lot.ref} : undefined)}
      active="payments"
      backLabel={dict.auth.backToSite}
      logoutLabel={dict.auth.logout}
    >
      <ClientPropertyTabs locale={locale} basePath={`/${locale}/espace-client/paiements`} properties={properties} selected={selected}/>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: dict.client.summary.total, value: formatMoney(total, locale, 3) },
          { label: dict.client.summary.paid, value: formatMoney(paid, locale, 3), accent: 'text-emerald-600' },
          { label: dict.client.summary.remaining, value: formatMoney(remaining, locale, 3), accent: 'text-gold-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-ink/8 bg-white p-6">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted">{kpi.label}</p>
            <p className={`mt-3 font-display text-[26px] font-light leading-none ${kpi.accent ?? 'text-ink'}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink/8 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-[13.5px]">
            <thead>
              <tr className="bg-sand/40 text-[11px] uppercase tracking-[0.1em] text-muted">
                <th className="px-6 py-3 text-start font-semibold">{dict.client.paymentsTable.label}</th>
                <th className="px-6 py-3 text-start font-semibold">{dict.client.paymentsTable.due}</th>
                <th className="px-6 py-3 text-end font-semibold">{dict.client.paymentsTable.amount}</th>
                <th className="px-6 py-3 text-end font-semibold">{dict.client.summary.paid}</th>
                <th className="px-6 py-3 text-end font-semibold">{dict.client.summary.remaining}</th>
                <th className="px-6 py-3 text-end font-semibold">{dict.client.paymentsTable.status}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const received = paymentPaidAmount(p);
                const lineRemaining = paymentSummary([p]).remaining;
                const late = !paymentIsPaid(p) && p.dueDate < today;
                return (
                  <tr key={p.id} className="border-t border-ink/6">
                    <td className="px-6 py-4 font-medium text-ink">{t(p.label, locale)}
                      {!!p.receipts?.length && <details className="mt-3 text-xs font-normal text-ink/60"><summary className="cursor-pointer">{dict.client.paymentsTable.receipts} ({p.receipts.length})</summary><ul className="mt-2 space-y-2">{p.receipts.map(receipt => <li key={receipt.id}>{formatDate(receipt.date, locale)} · {formatMoney(receipt.amount, locale, 3)}{receipt.reference ? ` · ${receipt.reference}` : ''}</li>)}</ul></details>}
                    </td>
                    <td className="px-6 py-4 text-ink/60">{formatDate(p.dueDate, locale)}</td>
                    <td className="px-6 py-4 text-end font-semibold text-ink">{formatMoney(p.amount, locale, 3)}</td>
                    <td className="px-6 py-4 text-end text-emerald-700">{formatMoney(received, locale, 3)}</td>
                    <td className="px-6 py-4 text-end text-gold-700">{formatMoney(lineRemaining, locale, 3)}</td>
                    <td className="px-6 py-4 text-end">
                      <span
                        className={`chip ${
                          paymentIsPaid(p)
                            ? 'bg-emerald-50 text-emerald-700'
                            : late
                              ? 'bg-red-50 text-red-700'
                              : 'bg-sand text-muted'
                        }`}
                      >
                        {paymentIsPaid(p) ? <IconCheck className="h-3 w-3" /> : <IconClock className="h-3 w-3" />}
                        {paymentIsPaid(p)
                          ? dict.client.paymentsTable.paid
                          : received > 0
                            ? `${dict.client.paymentsTable.partial}${late ? ` · ${dict.client.paymentsTable.late}` : ''}`
                            : late
                            ? dict.client.paymentsTable.late
                            : dict.client.paymentsTable.pending}
                      </span>
                      {paymentIsPaid(p) && p.paidAt && <p className="mt-2 text-xs text-muted">{dict.client.paymentsTable.paidOn} {formatDate(p.paidAt, locale)}</p>}
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">
                    {selected ? dict.client.paymentsEmpty : dict.client.noLot}
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
