import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireAdminUser } from '@/lib/auth';
import { getActivitiesForContact, getContact, getDealsForContact, getProjects } from '@/lib/db';
import { formatDate, formatMoney } from '@/lib/format';
import { DEAL_STAGES } from '@/lib/types';
import { addActivityAction, addTaskAction, setDealStageAction, updateDealAction } from '@/lib/actions';
import PortalShell from '@/components/portal/PortalShell';
import { adminNav } from '@/components/portal/clientNav';
import { IconArrowLeft, IconMail, IconPhone, IconPin } from '@/components/Icons';

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const user = await requireAdminUser(locale);

  const contact = getContact(id);
  if (!contact) notFound();

  const deals = getDealsForContact(id);
  const activities = getActivitiesForContact(id);
  const projectNames = new Map(getProjects().map((p) => [p.slug, p.name]));

  return (
    <PortalShell
      locale={locale}
      title={contact.name}
      subtitle={dict.crm.contacts}
      userName={user.name}
      nav={adminNav(locale, dict)}
      active="contacts"
      backLabel={dict.auth.backToSite}
      logoutLabel={dict.auth.logout}
      accent="admin"
    >
      <Link
        href={`/${locale}/admin/contacts`}
        className="mb-6 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink/45 transition hover:text-gold-600"
      >
        <IconArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {dict.crm.contacts}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ---- Fiche ---- */}
        <aside className="lg:sticky lg:top-8 lg:h-fit">
          <div className="overflow-hidden rounded-2xl border border-ink/8 bg-white">
            <div className="bg-ink px-6 py-6 text-white">
              <p className="font-display text-[28px] font-light leading-tight">{contact.name}</p>
              <p className="mt-2 text-[12px] text-white/45">
                {dict.crm.sources[contact.source] ?? contact.source} · {formatDate(contact.createdAt, locale)}
              </p>
              {contact.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {contact.tags.map((tag) => (
                    <span key={tag} className="chip bg-white/10 text-gold-200">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <ul className="divide-y divide-ink/6 px-6">
              <li className="flex items-center gap-3 py-3.5 text-[14px]">
                <IconPhone className="h-4 w-4 shrink-0 text-gold-500" />
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="text-ink hover:text-gold-600">
                  {contact.phone}
                </a>
              </li>
              {contact.email && (
                <li className="flex items-center gap-3 py-3.5 text-[14px]">
                  <IconMail className="h-4 w-4 shrink-0 text-gold-500" />
                  <a href={`mailto:${contact.email}`} className="truncate text-ink hover:text-gold-600">
                    {contact.email}
                  </a>
                </li>
              )}
              {contact.city && (
                <li className="flex items-center gap-3 py-3.5 text-[14px]">
                  <IconPin className="h-4 w-4 shrink-0 text-gold-500" />
                  <span className="text-ink/70">{contact.city}</span>
                </li>
              )}
              {contact.budget && (
                <li className="flex items-center justify-between gap-3 py-3.5 text-[14px]">
                  <span className="text-[12px] uppercase tracking-[0.1em] text-ink/45">{dict.crm.budget}</span>
                  <span className="text-ink/75">{contact.budget}</span>
                </li>
              )}
            </ul>
          </div>

          {/* ---- Nouvelle tâche ---- */}
          <form action={addTaskAction} className="mt-6 rounded-2xl border border-ink/8 bg-white p-5">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink/50">{dict.crm.addTask}</h3>
            <input type="hidden" name="contactId" value={contact.id} />
            <input name="title" required placeholder={dict.crm.taskTitle} className="field mt-4" />
            <input name="dueDate" type="date" className="field mt-3" />
            <button type="submit" className="btn-ghost mt-4 w-full !py-2.5 !text-[11px]">
              {dict.crm.save}
            </button>
          </form>
        </aside>

        <div className="min-w-0 space-y-6">
          {/* ---- Opportunités ---- */}
          <section className="overflow-hidden rounded-2xl border border-ink/8 bg-white">
            <h2 className="border-b border-ink/8 px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink/50">
              {dict.crm.dealsOf}
            </h2>
            {deals.length === 0 ? (
              <p className="px-6 py-10 text-center text-ink/45">{dict.crm.noDeals}</p>
            ) : (
              <ul className="divide-y divide-ink/6">
                {deals.map((deal) => (
                  <li key={deal.id} className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-[21px] font-light text-ink">{deal.title}</p>
                        <p className="mt-1.5 flex flex-wrap gap-x-4 text-[12.5px] text-ink/45">
                          {deal.projectSlug && <span>{projectNames.get(deal.projectSlug) ?? deal.projectSlug}</span>}
                          {deal.lotRef && <span className="text-gold-600">{deal.lotRef}</span>}
                          <span>
                            {dict.crm.table.probability} {deal.probability} %
                          </span>
                        </p>
                      </div>
                      <span className="chip bg-sand text-ink/65">{dict.crm.stages[deal.stage]}</span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <form action={updateDealAction} className="flex items-end gap-2">
                        <input type="hidden" name="dealId" value={deal.id} />
                        <div className="flex-1">
                          <label className="label" htmlFor={`v-${deal.id}`}>
                            {dict.crm.table.value}
                          </label>
                          <input
                            id={`v-${deal.id}`}
                            name="value"
                            type="number"
                            defaultValue={deal.value ?? ''}
                            className="field !py-2"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="label" htmlFor={`c-${deal.id}`}>
                            {dict.crm.table.close}
                          </label>
                          <input
                            id={`c-${deal.id}`}
                            name="expectedCloseDate"
                            type="date"
                            defaultValue={deal.expectedCloseDate ?? ''}
                            className="field !py-2"
                          />
                        </div>
                        <button type="submit" className="btn-ghost !px-4 !py-2.5 !text-[11px]">
                          OK
                        </button>
                      </form>

                      <form action={setDealStageAction} className="flex items-end gap-2">
                        <input type="hidden" name="dealId" value={deal.id} />
                        <div className="flex-1">
                          <label className="label" htmlFor={`s-${deal.id}`}>
                            {dict.crm.table.stage}
                          </label>
                          <select id={`s-${deal.id}`} name="stage" defaultValue={deal.stage} className="field !py-2">
                            {DEAL_STAGES.map((s) => (
                              <option key={s} value={s}>
                                {dict.crm.stages[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button type="submit" className="btn-ghost !px-4 !py-2.5 !text-[11px]">
                          {dict.crm.moveTo}
                        </button>
                      </form>
                    </div>

                    {deal.value ? (
                      <p className="mt-4 font-display text-[22px] text-gold-600">{formatMoney(deal.value, locale)}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---- Activités ---- */}
          <section className="overflow-hidden rounded-2xl border border-ink/8 bg-white">
            <h2 className="border-b border-ink/8 px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink/50">
              {dict.crm.activities}
            </h2>

            <form action={addActivityAction} className="grid gap-3 border-b border-ink/6 p-6 sm:grid-cols-[160px_1fr_auto]">
              <input type="hidden" name="contactId" value={contact.id} />
              <select name="type" className="field" defaultValue="call">
                {(Object.keys(dict.crm.types) as (keyof typeof dict.crm.types)[]).map((tp) => (
                  <option key={tp} value={tp}>
                    {dict.crm.types[tp]}
                  </option>
                ))}
              </select>
              <input name="body" required placeholder={dict.crm.writeActivity} className="field" />
              <button type="submit" className="btn-gold !px-5 !py-2.5 !text-[11px]">
                {dict.crm.addActivity}
              </button>
            </form>

            {activities.length === 0 ? (
              <p className="px-6 py-10 text-center text-ink/45">{dict.crm.noActivities}</p>
            ) : (
              <ol className="relative space-y-6 p-6 ps-12">
                <span className="absolute bottom-8 start-[30px] top-9 w-px bg-ink/10" />
                {activities.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -start-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-gold-400 ring-4 ring-white" />
                    <p className="flex flex-wrap items-center gap-x-3 text-[11.5px]">
                      <span className="font-semibold uppercase tracking-wider text-gold-600">
                        {dict.crm.types[a.type]}
                      </span>
                      <span className="text-ink/40">{formatDate(a.date, locale)}</span>
                    </p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-ink/75">{a.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </PortalShell>
  );
}
