import Link from 'next/link';
import Image from 'next/image';
import PropertyActions from '@/components/site/PropertySelection';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { getProject } from '@/lib/db';
import { t, formatArea, formatMoney, floorLabel } from '@/lib/format';
import { SITE } from '@/lib/site';
import { getCompanySite } from '@/lib/company';
import Reveal from '@/components/Reveal';
import SectionHeading from '@/components/site/SectionHeading';
import { DeferredMaquette as MaquetteSection, DeferredPanorama as Panorama360 } from '@/components/site/DeferredViewers';
import PlanViewer from '@/components/site/PlanViewer';
import ApartmentInterior from '@/components/site/ApartmentInterior';
import YassamineFinancing from '@/components/site/YassamineFinancing';
import ProgressMeter from '@/components/site/ProgressMeter';
import Gallery from '@/components/site/Gallery';
import { alternates, jsonLd } from '@/lib/seo';
import LazyMount from '@/components/site/LazyMount';
import CreditSimulator from '@/components/site/CreditSimulator';
import { IconArrow, IconArrowLeft, IconCheck, IconPhone, IconPin } from '@/components/Icons';
import { publicFileExists, panoramaAssets } from '@/lib/assets';

export const dynamicParams = true;

function representativePanorama(slug: string, roomId: string, typology: string): string | undefined {
  if (slug === 'residence-la-gloire') {
    if (roomId === 'cuisine') return '/360/representative/la-gloire/cuisine.webp';
    if (roomId === 'chambre-1' && Number(typology.replace(/\D/g, '')) > 1) {
      return '/360/representative/la-gloire/suite-parentale.webp';
    }
    if (roomId.startsWith('chambre-')) return '/360/representative/la-gloire/chambre.webp';
  }
  if (slug === 'diar-al-yassamine') {
    if (roomId === 'salon' || roomId === 'cuisine' || roomId === 'sdb') {
      return `/360/representative/diar-al-yassamine/${roomId}.webp`;
    }
    if (roomId.startsWith('chambre-')) return '/360/representative/diar-al-yassamine/chambre.webp';
  }
  return undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; ref: string }>;
}): Promise<Metadata> {
  const { locale, slug, ref } = await params;
  const project = (await getProject(slug));
  const lot = project?.lots.find(l => l.ref === ref);
  if (!project || !lot) return {};
  const l = (isLocale(locale) ? locale : 'fr') as Locale;
  const area = lot.sellableArea
    ? `${formatArea(lot.sellableArea, l)}${project.slug === 'diar-al-yassamine' && lot.block === 'A5.a'
      ? l === 'ar' ? ' (تقريبية)' : l === 'en' ? ' (approx.)' : ' (approx.)'
      : ''}`
    : '';
  const hasTour = (lot.rooms ?? []).some(room => panoramaAssets(room.panorama).available
    || publicFileExists(representativePanorama(project.slug, room.id, lot.typology)));
  const features = l === 'ar'
    ? `المخطط والتوفر${hasTour ? ' والجولة الافتراضية 360°' : ''}. اطلب زيارة في الموقع أو عبر الفيديو.`
    : l === 'en'
      ? `Floor plan and availability${hasTour ? ', plus a 360° virtual tour' : ''}. Request an on-site or video visit.`
      : `Plan et disponibilité${hasTour ? ', visite virtuelle 360°' : ''}. Demandez une visite sur place ou en visioconférence.`;
  return {
    alternates: alternates(l, `/projets/${slug}/appartements/${ref}`),
    title: `${lot.code} — ${lot.typology} · ${project.name}`,
    description: `${lot.code} · ${lot.typology}${area ? ` · ${area}` : ''} — ${project.name}, ${t(project.address, l)}. ${features}`,
    openGraph: { title: `${lot.code} · ${project.name}`, url: `${SITE.url}/${l}/projets/${slug}/appartements/${ref}`, images: [project.cover] },
  };
}

const STATUS_TONE: Record<string, string> = {
  available: 'bg-emerald-500/15 text-emerald-300',
  reserved: 'bg-amber-500/15 text-amber-300',
  sold: 'bg-white/10 text-white/50',
};

const architectModelSubtitle = {
  fr: 'Explorez la résidence en 3D et sélectionnez un appartement pour découvrir sa fiche.',
  en: 'Explore the residence in 3D and select an apartment to view its details.',
  ar: 'استكشف الإقامة ثلاثية الأبعاد واختر شقة للاطلاع على تفاصيلها.',
};

export default async function ApartmentPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; ref: string }>;
}) {
  const { locale: raw, slug, ref } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const SITE = (await getCompanySite());

  const project = (await getProject(slug));
  const lot = project?.lots.find((l) => l.ref === ref);
  if (!project || !lot) notFound();

  const rooms = lot.rooms ?? [];
  const tourRooms = rooms.map(r => {
    const assets = panoramaAssets(r.panorama);
    if (assets.available) return { id: r.id, label: t(r.label, locale), ...assets };
    const illustration = representativePanorama(project.slug, r.id, lot.typology);
    if (publicFileExists(illustration)) {
      return {
        id: r.id,
        label: t(r.label, locale),
        panorama: illustration,
        available: true,
        source: locale === 'ar' ? 'تصوّر توضيحي' : locale === 'en' ? 'Illustrative view' : 'Vue illustrative',
      };
    }
    return { id: r.id, label: t(r.label, locale), ...assets };
  });
  const interiorImage = `/interiors/la-gloire/${lot.ref}.webp`;
  const similar = project.lots
    .filter((l) => l.ref !== lot.ref && l.typology === lot.typology && l.status === 'available')
    .slice(0, 4);

  const contactHref = `/${locale}/contact?project=${project.slug}&lot=${encodeURIComponent(lot.code)}`;
  const a5PlanArea = project.slug === 'diar-al-yassamine' && lot.block === 'A5.a';
  const a5AreaPending = a5PlanArea && !lot.sellableArea;
  const pendingAreaLabel = locale === 'ar' ? 'بانتظار التأكيد' : locale === 'en' ? 'To be confirmed' : 'À confirmer';
  const saleAreaLabel = a5PlanArea
    ? locale === 'ar' ? 'مساحة الأرضية (تقريبية)' : locale === 'en' ? 'Floor area (approx.)' : 'Surface du plancher (approx.)'
    : dict.availability.table.sellable;
  const grossAreaLabel = a5PlanArea
    ? locale === 'ar' ? 'المساحة خارج الجدران (تقريبية)' : locale === 'en' ? 'Gross area (approx.)' : 'Surface hors œuvre (approx.)'
    : dict.availability.table.gross;
  // The A5.a floor sheets identify the apartments, but do not state saleable areas.
  const a5FloorSheet = a5AreaPending && (lot.floor === 0 || lot.floor === 1)
    ? `/models/yassamine/A5a-${lot.floor}`
    : undefined;
  const individualPlanExists = publicFileExists(lot.planImage);
  const planImage = individualPlanExists ? lot.planImage : a5FloorSheet ? `${a5FloorSheet}.webp` : undefined;
  const planPdf = individualPlanExists && publicFileExists(lot.planUrl)
    ? lot.planUrl
    : a5FloorSheet ? `${a5FloorSheet}.pdf` : undefined;

  const figures = [
    { label: saleAreaLabel, value: a5AreaPending ? pendingAreaLabel : formatArea(lot.sellableArea, locale), accent: true },
    { label: grossAreaLabel, value: a5AreaPending && !lot.grossArea ? pendingAreaLabel : formatArea(lot.grossArea, locale) },
    { label: dict.availability.table.typology, value: lot.typology },
    { label: dict.availability.floor, value: floorLabel(lot.floor, locale) },
  ];

  const specs = [
    { k: dict.apartment.ref, v: lot.ref },
    { k: dict.availability.block, v: lot.block },
    { k: dict.availability.floor, v: floorLabel(lot.floor, locale) },
    { k: dict.availability.table.typology, v: lot.typology },
    { k: grossAreaLabel, v: a5AreaPending && !lot.grossArea ? pendingAreaLabel : formatArea(lot.grossArea, locale) },
    { k: saleAreaLabel, v: a5AreaPending ? pendingAreaLabel : formatArea(lot.sellableArea, locale) },
    ...(lot.gardenArea ? [{ k: dict.availability.table.garden, v: formatArea(lot.gardenArea, locale) }] : []),
    ...(lot.terraceArea ? [{ k: dict.availability.table.terrace, v: formatArea(lot.terraceArea, locale) }] : []),
    { k: dict.availability.table.price, v: lot.price ? formatMoney(lot.price, locale) : dict.availability.onRequest },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({
        '@context': 'https://schema.org', '@type': 'Apartment', name: `${lot.code} · ${project.name}`,
        url: `${SITE.url}/${locale}/projets/${project.slug}/appartements/${lot.ref}`,
        image: `${SITE.url}${project.cover}`, numberOfBedrooms: Number(lot.typology.replace(/\D/g, '')) || undefined,
        floorSize: lot.sellableArea ? { '@type': 'QuantitativeValue', value: lot.sellableArea, unitCode: 'MTK' } : undefined,
        address: { '@type': 'PostalAddress', streetAddress: t(project.address, locale), addressLocality: project.city, addressCountry: 'TN' },
        offers: lot.price && lot.status !== 'sold' ? { '@type': 'Offer', price: lot.price, priceCurrency: 'TND', url: `${SITE.url}/${locale}/projets/${project.slug}/appartements/${lot.ref}` } : undefined,
      }) }} />
      {/* ---- En-tête ---- */}
      <section className="relative isolate overflow-hidden bg-ink pb-16 pt-36 lg:pb-20 lg:pt-44">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Image src={project.heroImage} alt="" fill priority sizes="100vw" quality={75} className="object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/85 to-ink/60" />
        </div>

        <div className="container-lux relative">
          <nav className="mb-7 flex flex-wrap items-center gap-2 text-[12px] text-white/45">
            <Link href={`/${locale}/projets`} className="transition hover:text-gold-300">
              {dict.nav.projects}
            </Link>
            <span className="text-white/25">/</span>
            <Link href={`/${locale}/projets/${project.slug}`} className="transition hover:text-gold-300">
              {project.name}
            </Link>
            <span className="text-white/25">/</span>
            <span className="text-white/70">{lot.code}</span>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <span className="eyebrow !text-gold-300">{dict.apartment.eyebrow}</span>
              <h1 className="h-display mt-4 text-[52px] leading-none text-white sm:text-[68px]">{lot.code}</h1>
              <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-white/60">
                <span className="flex items-center gap-1.5">
                  <IconPin className="h-4 w-4 text-gold-400" />
                  {project.name} — {t(project.address, locale)}
                </span>
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <span className={`chip ${STATUS_TONE[lot.status]}`}>{dict.availability.legend[lot.status]}</span>
                <span className="chip bg-white/10 text-white/70">{lot.typology}</span>
                <span className="chip bg-white/10 text-white/70">{floorLabel(lot.floor, locale)}</span>
                {lot.gardenArea ? <span className="chip bg-white/10 text-white/70">{dict.amenities.garden}</span> : null}
                {lot.terraceArea ? <span className="chip bg-white/10 text-white/70">{dict.amenities.terrace}</span> : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {lot.status !== 'sold' && (
                <Link href={contactHref} className="btn-gold">
                  {dict.apartment.reserve}
                  <IconArrow className="h-4 w-4 rtl:rotate-180" />
                </Link>
              )}
              <a href={`tel:${SITE.office.phones[0].replace(/\s/g, '')}`} className="btn-ghost-light">
                <IconPhone className="h-4 w-4" />
                {SITE.office.phones[0]}
              </a>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gold-gradient opacity-60" />
      </section>

      {/* ---- Chiffres clés ---- */}
      <section className="border-b border-ink/8 bg-white">
        <div className="container-lux grid grid-cols-2 gap-y-6 py-9 lg:grid-cols-4">
          {figures.map((f, i) => (
            <Reveal key={f.label} delay={i * 70} className="px-2 text-center">
              <p
                className={`font-display text-[26px] font-light leading-tight lg:text-[32px] ${
                  f.accent ? 'text-gold-600' : 'text-ink'
                }`}
              >
                {f.value}
              </p>
              <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink/45">{f.label}</p>
            </Reveal>
          ))}
        </div>
        {a5PlanArea && <p className="container-lux pb-6 text-sm text-ink/65">
          {a5AreaPending
            ? locale === 'ar' ? 'مساحة الشقة قيد التحقق. اطلب جدول المساحات من الفريق التجاري.' : locale === 'en' ? 'The apartment area is being verified. Request its area schedule from the sales team.' : 'La surface de cet appartement est en cours de vérification. Demandez son tableau de surfaces au service commercial.'
            : locale === 'ar' ? 'المساحات تقريبية كما وردت في مخطط البيع الفردي لهذه الشقة. تحقّق من المساحة التعاقدية قبل الشراء.' : locale === 'en' ? 'These are approximate areas stated on this apartment’s individual sales plan. Confirm the contractual area before purchase.' : 'Surfaces approximatives relevées sur le plan de vente individuel de cet appartement. Vérifiez la surface contractuelle avant l’achat.'}
          {' '}<Link href={contactHref} className="font-semibold underline underline-offset-4">{locale === 'ar' ? 'طلب التأكيد' : locale === 'en' ? 'Request confirmation' : 'Demander confirmation'}</Link>
        </p>}
      </section>

      <div className="container-lux py-6"><PropertyActions id={`${project.slug}/${lot.ref}`} locale={locale} showVisit available={lot.status === 'available'}/></div>
      {/* ---- 1. Maquette 3D ---- */}
      {project.massing && project.slug !== 'diar-al-yassamine' && (
        <section id="maquette" className="scroll-mt-28 bg-ivory py-20 lg:py-24">
          <div className="container-lux">
            <SectionHeading
              eyebrow={dict.apartment.maquette}
              title={dict.maquette.title}
              subtitle={project.slug === 'residence-la-gloire' ? architectModelSubtitle[locale] : dict.maquette.subtitle}
            />
            <div className="mt-10">
              <LazyMount minHeight={920} desktopMinHeight={960} loadingLabel={locale === 'ar' ? 'تحميل المجسم…' : locale === 'en' ? 'Loading the 3D model…' : 'Chargement de la maquette 3D…'}>
              <MaquetteSection
                locale={locale}
                projectSlug={project.slug}
                lots={project.lots.map(({ref,code,block,floor,typology,sellableArea,status,footprint,gardenArea,terraceArea})=>({ref,code,block,floor,typology,sellableArea,status,footprint,gardenArea,terraceArea}))}
                massing={project.massing}
                selectedRef={lot.ref}
                labels={{
                  ...dict.maquette,
                  title: dict.maquette.title,
                  hint: dict.maquette.hint,
                  legend: dict.availability.legend,
                  reset: dict.maquette.reset,
                  loading: dict.maquette.loading,
                  select: dict.maquette.select,
                  allFloors: dict.common.all,
                  floor: dict.availability.floor,
                  realistic: dict.maquette.realistic,
                  commercial: dict.maquette.commercial,
                }}
              />
              </LazyMount>
            </div>
          </div>
        </section>
      )}

      {/* ---- 2. Plan AutoCAD ---- */}
      <section id="plan" className="scroll-mt-28 bg-white py-20 lg:py-24">
        <div className="container-lux grid gap-10 lg:grid-cols-[1.45fr_1fr] lg:gap-14">
          <div>
            <SectionHeading eyebrow={dict.plan.title} title={dict.apartment.plan} />
            <div className="mt-9">
              <PlanViewer
                image={planImage}
                pdf={planPdf}
                alt={a5FloorSheet && !individualPlanExists ? `${dict.apartment.plan} · ${floorLabel(lot.floor, locale)} · ${lot.code}` : `${dict.apartment.plan} ${lot.code}`}
                labels={dict.plan}
                exists={publicFileExists(planImage)}
              />
              {a5FloorSheet && !individualPlanExists && <p className="mt-3 text-sm text-ink/60">
                {locale === 'ar' ? 'مخطط الطابق الكامل للعمارة A5.a؛ ابحث عن مرجع الشقة على الرسم.' : locale === 'en' ? 'Full floor plan for block A5.a; locate the apartment reference on the drawing.' : 'Plan de l’étage complet du bloc A5.a ; repérez la référence de l’appartement sur le dessin.'}
              </p>}
              {lot.planDwgUrl && <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
                <Link href={`/${locale}/projets/${project.slug}#plans-rdc`} className="underline underline-offset-4">
                  {locale === 'ar' ? 'مخططات الطابق الأرضي' : locale === 'en' ? 'Ground-floor plans' : 'Plans d’ensemble du RDC'}
                </Link>
              </div>}
            </div>
          </div>

          <Reveal delay={110}>
            <div className="overflow-hidden rounded-2xl border border-ink/8 bg-ivory">
              <h3 className="border-b border-ink/8 px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-ink/50">
                {dict.apartment.specs}
              </h3>
              <dl className="divide-y divide-ink/6 px-6">
                {specs.map((row) => (
                  <div key={row.k} className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="text-[12px] uppercase tracking-[0.1em] text-ink/45">{row.k}</dt>
                    <dd className="text-[14px] font-medium text-ink">{row.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {rooms.length > 0 && (
              <div className="mt-6 rounded-2xl border border-ink/8 bg-ivory p-6">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink/50">
                  {dict.apartment.composition}
                </h3>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {rooms.map((room) => (
                    <li key={room.id} className="flex items-center gap-2.5 text-[13.5px] text-ink/70">
                      <IconCheck className="h-4 w-4 shrink-0 text-gold-500" />
                      {t(room.label, locale)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* ---- 3. Visite 360° ---- */}
      <div className="container-lux"><ProgressMeter value={lot.progressPercent} locale={locale}/></div>
      {!!lot.gallery?.length && <section id="galerie" className="container-lux scroll-mt-28 py-12"><h2 className="h-display mb-6 text-3xl">{dict.project.gallery}</h2><Gallery items={lot.gallery.map(p=>({src:p.src,caption:t(p.caption,locale)}))} labels={{close:locale==='fr'?'Fermer':'Close',previous:locale==='fr'?'Précédent':'Previous',next:locale==='fr'?'Suivant':'Next',of:'/'}}/></section>}
      {project.slug === 'residence-la-gloire' && publicFileExists(interiorImage) && (
        <ApartmentInterior locale={locale} image={interiorImage} reference={lot.ref} pdf={lot.planUrl} />
      )}
      {tourRooms.some(room=>room.available) && (
        <section id="visite-360" className="scroll-mt-28 bg-ivory py-20 lg:py-24">
          <div className="container-lux">
            <SectionHeading eyebrow={dict.apartment.tour360} title={dict.pano.title} subtitle={dict.pano.hint} />
            {tourRooms.some(room => room.source) && (
              <p className="mt-4 max-w-3xl text-sm text-ink/55">
                {locale === 'ar'
                  ? 'بعض المشاهد تصوّرات بانورامية مستوحاة من صور وتشطيبات الإقامة؛ مخطط الشقة الأصلي هو مرجع التوزيع والأبعاد.'
                  : locale === 'en'
                    ? 'Some panoramic views illustrate the residence’s images and finishes. The original apartment plan is the reference for layout and dimensions.'
                    : 'Certaines vues panoramiques illustrent les images et finitions de la résidence. Le plan original de l’appartement reste la référence pour l’agencement et les dimensions.'}
              </p>
            )}
            <div className="mt-10">
              <LazyMount minHeight={720} desktopMinHeight={850} loadingLabel={dict.pano.loading}>
                <Panorama360
                  poster={project.gallery[0]?.src}
                  rooms={tourRooms}
                  labels={dict.pano}
                />
              </LazyMount>
            </div>
          </div>
        </section>
      )}

      {/* ---- 4. Financement ---- */}
      {project.slug === 'diar-al-yassamine' && <YassamineFinancing locale={locale} />}
      {project.status === 'ongoing' && lot.status !== 'sold' && (
        <section className="bg-white py-20 lg:py-24">
          <div className="container-lux">
            <SectionHeading
              eyebrow={dict.apartment.financing}
              title={dict.simulator.title}
              subtitle={dict.simulator.subtitle}
            />
            <div className="mt-10">
              <CreditSimulator
                locale={locale}
                labels={dict.simulator}
                contactHref={contactHref}
                defaultPrice={lot.price ?? Math.round((lot.sellableArea ?? 60) * 3200)}
              />
            </div>
          </div>
        </section>
      )}

      {/* ---- 5. Appartements similaires ---- */}
      {similar.length > 0 && (
        <section className="bg-ivory py-20 lg:py-24">
          <div className="container-lux">
            <SectionHeading eyebrow={project.name} title={dict.apartment.similar} />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((s, i) => (
                <Reveal key={s.ref} delay={i * 90}>
                  <Link
                    href={`/${locale}/projets/${project.slug}/appartements/${s.ref}`}
                    className="group block rounded-2xl border border-ink/8 bg-white p-6 transition hover:border-gold-300 hover:shadow-card"
                  >
                    <p className="font-display text-[26px] font-light leading-none text-ink">{s.code}</p>
                    <p className="mt-2 text-[12px] uppercase tracking-[0.12em] text-ink/45">
                      {s.typology} · {floorLabel(s.floor, locale)}
                    </p>
                    <p className="mt-4 font-display text-[20px] text-gold-600">{formatArea(s.sellableArea, locale)}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink/50 transition group-hover:text-gold-600">
                      {dict.projects.view}
                      <IconArrow className="h-3.5 w-3.5 rtl:rotate-180" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---- CTA ---- */}
      <section className="bg-ink">
        <div className="container-lux flex flex-col items-start gap-8 py-16 lg:flex-row lg:items-center lg:justify-between">
          <Reveal>
            {lot.status === 'sold' ? (
              <>
                <h2 className="h-display text-[30px] text-white sm:text-[36px]">{dict.apartment.sold}</h2>
                <p className="mt-4 max-w-md text-[15px] text-white/55">{dict.apartment.soldBody}</p>
              </>
            ) : (
              <>
                <h2 className="h-display text-[30px] text-white sm:text-[36px]">{dict.home.cta.title}</h2>
                <p className="mt-4 max-w-md text-[15px] text-white/55">{dict.home.cta.body}</p>
              </>
            )}
          </Reveal>
          <Reveal delay={110} className="flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/projets/${project.slug}#disponibilite`} className="btn-ghost-light">
              <IconArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {dict.apartment.backToProject}
            </Link>
            {lot.status !== 'sold' && (
              <Link href={contactHref} className="btn-gold">
                {dict.apartment.reserve}
                <IconArrow className="h-4 w-4 rtl:rotate-180" />
              </Link>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
