import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireAdminUser } from '@/lib/auth';
import { getContacts, getDeals, getProjects } from '@/lib/db';
import { formatDate, formatMoney } from '@/lib/format';
import ContactEditor from '@/components/admin/ContactEditor';
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
  const projects=await getProjects();
  const projectOptions=projects.map(project=>({slug:project.slug,name:project.name,lots:project.lots.map(lot=>({ref:lot.ref,code:lot.code}))}));
  const propertyLabels=locale==='ar'?{project:'المشروع',lot:'الشقة'}:locale==='en'?{project:'Project',lot:'Apartment'}:{project:'Projet',lot:'Appartement'};

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
        <ContactEditor projects={projectOptions} locale={locale} sources={dict.crm.sources}/>
      </details>

      {contacts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-12 text-center text-ink/50">
          {dict.crm.noContacts}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/8 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1160px] text-[13.5px]">
              <thead>
                <tr className="bg-sand/40 text-[11px] uppercase tracking-[0.1em] text-ink/50">
                  <th className="px-6 py-3 text-start font-semibold">{dict.crm.table.contact}</th>
                  <th className="px-6 py-3 text-start font-semibold">{dict.contact.form.phone}</th>
                  <th className="px-6 py-3 text-start font-semibold">{dict.crm.city}</th>
                  <th className="px-6 py-3 text-start font-semibold">{propertyLabels.project}</th>
                  <th className="px-6 py-3 text-start font-semibold">{propertyLabels.lot}</th>
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
                        {c.notes && <p className="mt-2 line-clamp-2 max-w-xs whitespace-pre-wrap text-xs text-ink/60">{c.notes}</p>}
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
                      <td className="px-6 py-3.5 text-ink/50">{projects.find(project=>project.slug===c.projectSlug)?.name??'—'}</td>
                      <td className="px-6 py-3.5 text-ink/50">{projects.find(project=>project.slug===c.projectSlug)?.lots.find(lot=>lot.ref===c.lotRef)?.code??'—'}</td>
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
