import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireAdminUser } from '@/lib/auth';
import { getProjects } from '@/lib/db';
import { listCrm } from '@/lib/crm';
import { formatDate, formatMoney } from '@/lib/format';
import ContactEditor from '@/components/admin/ContactEditor';
import PortalShell from '@/components/portal/PortalShell';
import { adminNav } from '@/components/portal/clientNav';
import { IconArrow } from '@/components/Icons';

export default async function ContactsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams:Promise<{after?:string;q?:string}> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const user = await requireAdminUser(locale);

  const query=await searchParams;
  const {items:contacts,next}=await listCrm('contacts',{after:query.after,query:query.q});
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
      <form className="mb-5 flex flex-wrap gap-3"><label className="flex-1"><span className="label">{dict.crm.contacts}</span><input type="search" name="q" className="field" defaultValue={query.q}/></label><button className="btn-ghost" type="submit">{locale==='ar'?'بحث':locale==='en'?'Search':'Rechercher'}</button></form>
      {/* ---- Nouveau contact ---- */}
      <details className="mb-6 overflow-hidden rounded-2xl border border-ink/8 bg-white">
        <summary className="cursor-pointer list-none px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-muted transition hover:text-gold-600">
          + {dict.crm.newContact}
        </summary>
        <ContactEditor projects={projectOptions} locale={locale} sources={dict.crm.sources}/>
      </details>

      {contacts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-12 text-center text-muted">
          {dict.crm.noContacts}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/8 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1160px] text-[13.5px]">
              <thead>
                <tr className="bg-sand/40 text-[11px] uppercase tracking-[0.1em] text-muted">
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
                  const value = c.dealValue;
                  return (
                    <tr key={c.id} className="border-t border-ink/6 transition hover:bg-sand/30">
                      <td className="px-6 py-3.5">
                        <Link href={`/${locale}/admin/contacts/${c.id}`} className="font-medium text-ink hover:text-gold-600">
                          {c.name}
                        </Link>
                        {c.notes && <p className="mt-2 line-clamp-2 max-w-xs whitespace-pre-wrap text-xs text-ink/60">{c.notes}</p>}
                        {c.tags.length > 0 && (
                          <span className="ms-2 text-[11px] text-muted">{c.tags.join(' · ')}</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-ink/60">
                        <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="hover:text-gold-600">
                          {c.phone}
                        </a>
                      </td>
                      <td className="px-6 py-3.5 text-muted">{c.city ?? '—'}</td>
                      <td className="px-6 py-3.5 text-muted">{projects.find(project=>project.slug===c.projectSlug)?.name??'—'}</td>
                      <td className="px-6 py-3.5 text-muted">{projects.find(project=>project.slug===c.projectSlug)?.lots.find(lot=>lot.ref===c.lotRef)?.code??'—'}</td>
                      <td className="px-6 py-3.5 text-muted">{dict.crm.sources[c.source] ?? c.source}</td>
                      <td className="px-6 py-3.5 text-ink/60">{c.dealCount}</td>
                      <td className="px-6 py-3.5 text-end font-medium text-gold-600">
                        {value ? formatMoney(value, locale) : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-muted">{formatDate(c.createdAt, locale)}</td>
                      <td className="px-6 py-3.5 text-end">
                        <Link
                          href={`/${locale}/admin/contacts/${c.id}`}
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted transition hover:text-gold-600"
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
      <nav aria-label={locale==='ar'?'الصفحات':'Pagination'} className="mt-5 flex flex-wrap gap-4"><Link className="btn-ghost" href={`/${locale}/admin/contacts?${new URLSearchParams({q:query.q??''})}`}>{locale==='ar'?'البداية':locale==='en'?'First page':'Première page'}</Link>{next&&<Link className="btn-ghost" href={`/${locale}/admin/contacts?${new URLSearchParams({after:next,q:query.q??''})}`}>{locale==='ar'?'التالي':locale==='en'?'Next page':'Page suivante'}</Link>}</nav>
    </PortalShell>
  );
}
