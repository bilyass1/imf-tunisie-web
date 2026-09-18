import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireAdminUser } from '@/lib/auth';
import { getContacts, getDeals } from '@/lib/db';
import { formatDate, formatMoney } from '@/lib/format';
import { addContactAction } from '@/lib/actions';
import PortalShell from '@/components/portal/PortalShell';
import { adminNav } from '@/components/portal/clientNav';
import { IconArrow } from '@/components/Icons';

export default async function ContactsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const user = await requireAdminUser(locale);

  const contacts = (await getContacts());
  const deals = (await getDeals());

  return (
    <PortalShell
      locale={locale}
      title={dict.crm.contacts}
      subtitle={`${contacts.length}`}
      userName={user.name}
      nav={adminNav(locale, dict)}
      active="contacts"
      backLabel={dict.auth.backToSite}
      logoutLabel={dict.auth.logout}
      accent="admin"
    >
      {/* ---- Nouveau contact ---- */}
      <details className="mb-6 overflow-hidden rounded-2xl border border-ink/8 bg-white">
        <summary className="cursor-pointer list-none px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink/55 transition hover:text-gold-600">
          + {dict.crm.newContact}
        </summary>
        <form action={addContactAction} className="grid gap-4 border-t border-ink/8 p-6 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="nc-name">
              {dict.contact.form.name} *
            </label>
            <input id="nc-name" name="name" required className="field" />
          </div>
          <div>
            <label className="label" htmlFor="nc-phone">
              {dict.contact.form.phone} *
            </label>
            <input id="nc-phone" name="phone" required className="field" />
          </div>
          <div>
            <label className="label" htmlFor="nc-email">
              {dict.contact.form.email}
            </label>
            <input id="nc-email" name="email" type="email" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="nc-city">
              {dict.crm.city}
            </label>
            <input id="nc-city" name="city" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="nc-source">
              {dict.crm.table.source}
            </label>
            <select id="nc-source" name="source" className="field">
              {(Object.keys(dict.crm.sources) as (keyof typeof dict.crm.sources)[]).map((s) => (
                <option key={s} value={s}>
                  {dict.crm.sources[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="nc-tags">
              {dict.crm.tags}
            </label>
            <input id="nc-tags" name="tags" className="field" placeholder="S+2, La Gloire" />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-gold">
              {dict.crm.save}
            </button>
          </div>
        </form>
      </details>

      {contacts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-12 text-center text-ink/50">
          {dict.crm.noContacts}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/8 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-[13.5px]">
              <thead>
                <tr className="bg-sand/40 text-[11px] uppercase tracking-[0.1em] text-ink/50">
                  <th className="px-6 py-3 text-start font-semibold">{dict.crm.table.contact}</th>
                  <th className="px-6 py-3 text-start font-semibold">{dict.contact.form.phone}</th>
                  <th className="px-6 py-3 text-start font-semibold">{dict.crm.city}</th>
                  <th className="px-6 py-3 text-start font-semibold">{dict.crm.table.source}</th>
                  <th className="px-6 py-3 text-start font-semibold">{dict.crm.dealsOf}</th>
                  <th className="px-6 py-3 text-end font-semibold">{dict.crm.table.value}</th>
                  <th className="px-6 py-3 text-start font-semibold">{dict.crm.createdAt}</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => {
                  const own = deals.filter((d) => d.contactId === c.id);
                  const value = own.reduce((s, d) => s + (d.value ?? 0), 0);
                  return (
                    <tr key={c.id} className="border-t border-ink/6 transition hover:bg-sand/30">
                      <td className="px-6 py-3.5">
                        <Link href={`/${locale}/admin/contacts/${c.id}`} className="font-medium text-ink hover:text-gold-600">
                          {c.name}
                        </Link>
                        {c.tags.length > 0 && (
                          <span className="ms-2 text-[11px] text-ink/35">{c.tags.join(' · ')}</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-ink/60">
                        <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="hover:text-gold-600">
                          {c.phone}
                        </a>
                      </td>
                      <td className="px-6 py-3.5 text-ink/50">{c.city ?? '—'}</td>
                      <td className="px-6 py-3.5 text-ink/50">{dict.crm.sources[c.source] ?? c.source}</td>
                      <td className="px-6 py-3.5 text-ink/60">{own.length}</td>
                      <td className="px-6 py-3.5 text-end font-medium text-gold-600">
                        {value ? formatMoney(value, locale) : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-ink/40">{formatDate(c.createdAt, locale)}</td>
                      <td className="px-6 py-3.5 text-end">
                        <Link
                          href={`/${locale}/admin/contacts/${c.id}`}
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink/45 transition hover:text-gold-600"
                        >
                          {dict.crm.openContact}
                          <IconArrow className="h-3.5 w-3.5 rtl:rotate-180" />
                        </Link>
                      </td>
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
