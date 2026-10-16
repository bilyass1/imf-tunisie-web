import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireAdminUser } from '@/lib/auth';
import { readDb, lotStats } from '@/lib/db';
import { formatArea, floorLabel } from '@/lib/format';
import { projectPresentation } from '@/lib/project-presentation';
import { clientProperties } from '@/lib/client-properties';
import PortalShell from '@/components/portal/PortalShell';
import { adminNav } from '@/components/portal/clientNav';
import LotRow from '@/components/admin/LotRow';
import LotCompositionEditor from '@/components/admin/LotCompositionEditor';

export default async function AdminLotsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ project?: string; block?: string; lot?: string }>;
}) {
  const { locale: raw } = await params;
  const { project: projectParam, block: blockParam, lot: lotParam } = await searchParams;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const user = await requireAdminUser(locale);

  const db=await readDb();
  const clients=db.users.filter(user=>user.role==='client');
  const clientOptions=clients.map(client=>({id:client.id,name:client.name,email:client.email}));
  const owners=new Map(clients.flatMap(client=>clientProperties(client).map(item=>[JSON.stringify([item.projectSlug,item.lotRef]),clientOptions.find(option=>option.id===client.id)!] as const)));
  const projects=db.projects.map(projectPresentation).filter(project=>project.lots.length>0);
  const project = projects.find((p) => p.slug === projectParam) ?? projects[0];

  if (!project) {
    return (
      <PortalShell
        locale={locale}
        title={dict.admin.lotsTitle}
        userName={user.name}
        nav={adminNav(locale, dict)}
        active="lots"
        backLabel={dict.auth.backToSite}
        logoutLabel={dict.auth.logout}
        accent="admin"
      >
        <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-10 text-center text-muted">
          {dict.availability.empty}
        </p>
      </PortalShell>
    );
  }

  const blocks = Array.from(new Set(project.lots.map((l) => l.block)));
  const activeBlock = blocks.includes(blockParam ?? '') ? (blockParam as string) : blocks[0];
  const lots = project.lots.filter((l) => l.block === activeBlock);
  const selectedLot = lots.find((lot) => lot.ref === lotParam);
  const stats = lotStats(project.lots);

  return (
    <PortalShell
      locale={locale}
      title={dict.admin.lotsTitle}
      subtitle={dict.admin.lotsSubtitle}
      userName={user.name}
      nav={adminNav(locale, dict)}
      active="lots"
      backLabel={dict.auth.backToSite}
      logoutLabel={dict.auth.logout}
      accent="admin"
    >
      {/* Sélecteurs */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex flex-wrap gap-1.5 rounded-full bg-white p-1 shadow-card ring-1 ring-ink/5">
          {projects.map((p) => (
            <Link
              key={p.slug}
              href={`/${locale}/admin/lots?project=${p.slug}`}
              className={`rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] transition ${
                p.slug === project.slug ? 'bg-gold-gradient text-ink' : 'text-muted hover:text-gold-600'
              }`}
            >
              {p.name}
            </Link>
          ))}
        </div>

        <span className="ms-auto flex flex-wrap gap-4 text-[12px] text-muted">
          <span className="text-emerald-600">
            {stats.available} {dict.availability.legend.available}
          </span>
          <span className="text-amber-600">
            {stats.reserved} {dict.availability.legend.reserved}
          </span>
          <span>
            {stats.sold} {dict.availability.legend.sold}
          </span>
        </span>
      </div>

      {blocks.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {blocks.map((b) => (
            <Link
              key={b}
              href={`/${locale}/admin/lots?project=${project.slug}&block=${encodeURIComponent(b)}`}
              className={`rounded-lg px-3.5 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] transition ${
                b === activeBlock ? 'bg-ink text-gold-200' : 'bg-white text-muted hover:text-gold-600'
              }`}
            >
              {dict.availability.block} {b}
            </Link>
          ))}
        </div>
      )}

      {selectedLot && <LotCompositionEditor key={selectedLot.ref} lot={selectedLot} projectSlug={project.slug} locale={locale} />}

      {/* Table */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-ink/8 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="bg-sand/40 text-[11px] uppercase tracking-[0.1em] text-muted">
                <th className="px-4 py-3 text-start font-semibold">{dict.availability.table.code}</th>
                <th className="px-4 py-3 text-start font-semibold">{dict.availability.floor}</th>
                <th className="px-4 py-3 text-start font-semibold">{dict.availability.table.typology}</th>
                <th className="px-4 py-3 text-start font-semibold">{dict.availability.table.sellable}</th>
                <th className="px-4 py-3 text-start font-semibold">{dict.availability.table.status}</th>
                <th className="px-4 py-3 text-start font-semibold">{dict.availability.table.price}</th>
                <th className="px-4 py-3 text-start font-semibold">{dict.apartment.composition}</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <LotRow
                  key={lot.ref}
                  lot={lot}
                  projectSlug={project.slug}
                  owner={owners.get(JSON.stringify([project.slug,lot.ref]))}
                  clients={clientOptions}
                  floorText={floorLabel(lot.floor, locale)}
                  areaText={formatArea(lot.sellableArea, locale)}
                  statusLabels={dict.availability.legend}
                  compositionHref={`/${locale}/admin/lots?project=${encodeURIComponent(project.slug)}&block=${encodeURIComponent(activeBlock)}&lot=${encodeURIComponent(lot.ref)}#composition-editor`}
                  compositionLabel={locale === 'ar' ? 'تعديل' : locale === 'en' ? 'Edit' : 'Modifier'}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </PortalShell>
  );
}
