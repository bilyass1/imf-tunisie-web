import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireAdminUser } from '@/lib/auth';
import { getContacts, getDeals, getProjects, pipelineStats } from '@/lib/db';
import { formatMoney, formatDate } from '@/lib/format';
import { DEAL_STAGES, PIPELINE_STAGES, type DealStage } from '@/lib/types';
import { setDealStageAction } from '@/lib/actions';
import PortalShell from '@/components/portal/PortalShell';
import { adminNav } from '@/components/portal/clientNav';

const STAGE_TONE: Record<DealStage, string> = {
  new: 'border-t-ink/25',
  contacted: 'border-t-sky-400',
  visit: 'border-t-indigo-400',
  offer: 'border-t-gold-400',
  reserved: 'border-t-emerald-500',
  sold: 'border-t-emerald-600',
  lost: 'border-t-red-400',
};

export default async function PipelinePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const user = await requireAdminUser(locale);

  const deals = getDeals();
  const contacts = new Map(getContacts().map((c) => [c.id, c]));
  const projectNames = new Map(getProjects().map((p) => [p.slug, p.name]));
  const stats = pipelineStats();

  const columns: DealStage[] = [...PIPELINE_STAGES, 'sold', 'lost'];

  return (
    <PortalShell
      locale={locale}
      title={dict.crm.pipeline}
      subtitle={`${stats.openDeals} · ${formatMoney(stats.openValue, locale)}`}
      userName={user.name}
      nav={adminNav(locale, dict)}
      active="pipeline"
      backLabel={dict.auth.backToSite}
      logoutLabel={dict.auth.logout}
      accent="admin"
    >
      <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-4">
        {columns.map((stage) => {
          const column = deals.filter((d) => d.stage === stage);
          const value = column.reduce((s, d) => s + (d.value ?? 0), 0);

          return (
            <section
              key={stage}
              className={`w-[290px] shrink-0 rounded-2xl border border-ink/8 border-t-4 bg-white ${STAGE_TONE[stage]}`}
            >
              <header className="flex items-baseline justify-between px-4 py-3.5">
                <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink/60">
                  {dict.crm.stages[stage]}
                </h2>
                <span className="text-[11.5px] text-ink/40">{column.length}</span>
              </header>
              <p className="border-b border-ink/6 px-4 pb-3 text-[12px] font-medium text-gold-600">
                {formatMoney(value, locale)}
              </p>

              <div className="space-y-3 p-3">
                {column.length === 0 && (
                  <p className="px-2 py-6 text-center text-[12.5px] text-ink/35">{dict.crm.noDeals}</p>
                )}

                {column.map((deal) => {
                  const contact = contacts.get(deal.contactId);
                  return (
                    <article key={deal.id} className="rounded-xl border border-ink/8 bg-ivory p-3.5">
                      <p className="text-[13.5px] font-semibold leading-snug text-ink">{deal.title}</p>

                      {contact && (
                        <Link
                          href={`/${locale}/admin/contacts/${contact.id}`}
                          className="mt-1.5 block text-[12px] text-ink/50 transition hover:text-gold-600"
                        >
                          {contact.name} · {contact.phone}
                        </Link>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink/45">
                        {deal.value ? <span className="font-semibold text-ink/70">{formatMoney(deal.value, locale)}</span> : null}
                        {deal.projectSlug && <span>{projectNames.get(deal.projectSlug) ?? deal.projectSlug}</span>}
                        {deal.lotRef && <span className="font-medium text-gold-600">{deal.lotRef}</span>}
                      </div>

                      <p className="mt-2 text-[11px] text-ink/35">
                        {dict.crm.table.probability} {deal.probability} %
                        {deal.expectedCloseDate ? ` · ${formatDate(deal.expectedCloseDate, locale)}` : ''}
                      </p>

                      <form action={setDealStageAction} className="mt-3">
                        <input type="hidden" name="dealId" value={deal.id} />
                        <label className="sr-only" htmlFor={`stage-${deal.id}`}>
                          {dict.crm.moveTo}
                        </label>
                        <select
                          id={`stage-${deal.id}`}
                          name="stage"
                          defaultValue={deal.stage}
                          className="w-full rounded-lg border border-ink/12 bg-white px-3 py-1.5 text-[12px] text-ink/70 outline-none focus:border-gold-400"
                        >
                          {DEAL_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {dict.crm.stages[s]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="mt-2 w-full rounded-lg bg-ink py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-gold-600"
                        >
                          {dict.crm.moveTo}
                        </button>
                      </form>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </PortalShell>
  );
}
