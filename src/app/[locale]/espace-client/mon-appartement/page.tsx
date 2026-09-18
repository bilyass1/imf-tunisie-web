import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireClient } from '@/lib/auth';
import { getProject } from '@/lib/db';
import { t, formatArea, formatMoney, floorLabel } from '@/lib/format';
import PortalShell from '@/components/portal/PortalShell';
import { clientNav } from '@/components/portal/clientNav';
import { IconArrow, IconDownload, IconPin } from '@/components/Icons';
import ProgressMeter from '@/components/site/ProgressMeter';

export default async function MyLotPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const user = await requireClient(locale);

  const project = user.projectSlug ? (await getProject(user.projectSlug)) : undefined;
  const lot = project?.lots.find((l) => l.ref === user.lotRef);

  return (
    <PortalShell
      locale={locale}
      title={dict.client.myLot}
      subtitle={project?.name}
      userName={user.name}
      nav={clientNav(locale, dict)}
      active="lot"
      backLabel={dict.auth.backToSite}
      logoutLabel={dict.auth.logout}
    >
      {!project || !lot ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-10 text-center text-ink/50">
          {dict.client.noLot}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-ink/8 bg-white">
            <div className="relative aspect-[4/3]">
              <Image src={project.cover} alt={project.name} fill sizes="50vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-200">
                  <IconPin className="h-3.5 w-3.5" />
                  {t(project.address, locale)}
                </p>
                <p className="mt-2 font-display text-[32px] font-light text-white">{lot.code}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 p-6">
              <Link href={`/${locale}/projets/${project.slug}`} className="btn-ghost w-full">
                {project.name}
                <IconArrow className="h-4 w-4 rtl:rotate-180" />
              </Link>
              {lot.planUrl && (
                <a href={lot.planUrl} target="_blank" rel="noreferrer" className="btn-gold w-full">
                  <IconDownload className="h-4 w-4" />
                  {dict.project.downloadPlan}
                </a>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-ink/8 bg-white">
            <h2 className="border-b border-ink/8 px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink/50">
              {dict.project.specs}
            </h2>
            <dl className="divide-y divide-ink/6 px-6">
              {[
                { k: dict.availability.table.status, v: dict.availability.legend[lot.status] },
                { k: dict.availability.table.code, v: lot.code },
                { k: dict.availability.block, v: lot.block },
                { k: dict.availability.floor, v: floorLabel(lot.floor, locale) },
                { k: dict.availability.table.typology, v: lot.typology },
                { k: dict.availability.table.gross, v: formatArea(lot.grossArea, locale) },
                { k: dict.availability.table.sellable, v: formatArea(lot.sellableArea, locale) },
                ...(lot.gardenArea ? [{ k: dict.availability.table.garden, v: formatArea(lot.gardenArea, locale) }] : []),
                ...(lot.terraceArea ? [{ k: dict.availability.table.terrace, v: formatArea(lot.terraceArea, locale) }] : []),
                {
                  k: dict.availability.table.price,
                  v: lot.price ? formatMoney(lot.price, locale) : dict.availability.onRequest,
                },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between gap-4 py-4">
                  <dt className="text-[12px] uppercase tracking-[0.1em] text-ink/45">{row.k}</dt>
                  <dd className="text-[14.5px] font-medium text-ink">{row.v}</dd>
                </div>
              ))}
            </dl>
            <div className="px-6"><ProgressMeter value={lot.progressPercent} locale={locale}/></div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
