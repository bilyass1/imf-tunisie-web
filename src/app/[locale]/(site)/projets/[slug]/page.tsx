import Link from 'next/link';
import LaGloirePlanLibrary from '@/components/site/LaGloirePlanLibrary';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, locales, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { getProject, getProjects, lotStats } from '@/lib/db';
import { t, formatArea } from '@/lib/format';
import { SITE } from '@/lib/site';
import { projectMap } from '@/lib/project-maps';
import { YASSAMINE_PROGRAMME } from '@/lib/project-presentation';
import { getCompanySite } from '@/lib/company';
import Reveal from '@/components/Reveal';
import PageHero from '@/components/site/PageHero';
import SectionHeading from '@/components/site/SectionHeading';
import ProjectGallery from '@/components/site/ProjectGallery';
import { DeferredMaquette as MaquetteSection, DeferredYassamine as YassamineMaquette } from '@/components/site/DeferredViewers';
import YassaminePlanLibrary from '@/components/site/YassaminePlanLibrary';
import LazyMount from '@/components/site/LazyMount';
import AvailabilityPlan from '@/components/site/AvailabilityPlan';
import CreditSimulator from '@/components/site/CreditSimulator';
import YassamineFinancing from '@/components/site/YassamineFinancing';
import ProgressMeter from '@/components/site/ProgressMeter';
import { alternates } from '@/lib/seo';
import { AMENITY_ICONS, IconArrow, IconCheck, IconPin, IconPlay } from '@/components/Icons';

const architectModelSubtitle = {
  fr: 'Explorez la résidence en 3D et sélectionnez un appartement pour découvrir sa fiche.',
  en: 'Explore the residence in 3D and select an apartment to view its details.',
  ar: 'استكشف الإقامة ثلاثية الأبعاد واختر شقة للاطلاع على تفاصيلها.',
};

export async function generateStaticParams() {
  const projects = await getProjects();
  return locales.flatMap((locale) => projects.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = (await getProject(slug));
  if (!project) return {};
  const l = (isLocale(locale) ? locale : 'fr') as Locale;
  return {
    alternates: alternates(l, `/projets/${slug}`),
    title: project.name,
    description: t(project.description, l).slice(0, 180),
    openGraph: { title: project.name, url: `${SITE.url}/${l}/projets/${slug}`, images: [project.heroImage] },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const SITE = (await getCompanySite());
  const project = (await getProject(slug));
  if (!project) notFound();

  const stats = lotStats(project.lots);
  const programme = project.slug === 'diar-al-yassamine' ? YASSAMINE_PROGRAMME : undefined;
  const all = (await getProjects());
  const nextProject = all[(all.findIndex((p) => p.slug === slug) + 1) % all.length];

  const sections = [
    { id: 'programme', label: dict.project.overview },
    { id: 'galerie', label: dict.project.gallery },
    ...((project.slug === 'diar-al-yassamine' || (project.massing && project.lots.length)) ? [{ id: 'maquette', label: dict.apartment.maquette }] : []),
    ...(project.lots.length ? [{ id: 'disponibilite', label: dict.project.availability }] : []),
    ...(project.slug === 'residence-la-gloire' ? [{ id: 'plans', label: dict.apartment.plan }] : []),
    ...(project.slug === 'diar-al-yassamine' ? [{ id: 'plans-rdc', label: dict.apartment.plan }] : []),
    ...(project.status === 'ongoing' ? [{ id: 'financement', label: dict.project.simulator }] : []),
    { id: 'localisation', label: dict.project.location },
  ];

  return (
    <>
      <PageHero
        eyebrow={t(project.subtitle, locale)}
        title={project.name}
        subtitle={t(project.address, locale)}
        image={project.heroImage}
        breadcrumb={[
          { label: dict.nav.home, href: `/${locale}` },
          { label: dict.nav.projects, href: `/${locale}/projets` },
          { label: project.name, href: `/${locale}/projets/${project.slug}` },
        ]}
      >
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <span className={`chip ${project.status === 'ongoing' ? 'bg-gold-gradient text-ink' : 'bg-white/15 text-white/75'}`}>
            {project.status === 'ongoing' ? dict.projects.status.ongoing : dict.projects.status.delivered}
          </span>
          {project.foprolos && <span className="chip bg-white/12 text-gold-200">FOPROLOS</span>}
          {project.deliveryLabel && (
            <span className="chip bg-white/12 text-white/70">{t(project.deliveryLabel, locale)}</span>
          )}
        </div>
      </PageHero>

      {/* ---- Sous-navigation ---- */}
      <div className="sticky top-[76px] z-30 border-b border-ink/8 bg-ivory/95 backdrop-blur-lg lg:top-[84px]">
        <div className="container-lux no-scrollbar flex gap-1 overflow-x-auto py-3">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink/50 transition hover:bg-white hover:text-gold-600"
            >
              {s.label}
            </a>
          ))}
          <Link
            href={`/${locale}/contact?project=${project.slug}`}
            className="ms-auto hidden shrink-0 rounded-full bg-ink px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-gold-600 sm:block"
          >
            {dict.project.requestInfo}
          </Link>
        </div>
      </div>

      {/* ---- Chiffres clés ---- */}
      {stats.total > 0 && (
        <section className="border-b border-ink/8 bg-white">
          <div className="container-lux grid grid-cols-2 gap-y-6 py-10 lg:grid-cols-4">
            {(programme ? [
              { value: String(programme.apartments), label: locale === 'ar' ? 'شقق المشروع' : locale === 'en' ? 'Apartments in the development' : 'Appartements du programme' },
              { value: String(stats.total), label: locale === 'ar' ? 'شقق معروضة على الموقع' : locale === 'en' ? 'Apartments listed online' : 'Appartements en ligne' },
              { value: String(stats.available), label: locale === 'ar' ? 'متاحة على الموقع' : locale === 'en' ? 'Available online' : 'Disponibles en ligne', accent: true },
              { value: String(stats.sold), label: locale === 'ar' ? 'مباعة من الشقق المعروضة' : locale === 'en' ? 'Sold among listed apartments' : 'Vendus parmi les lots en ligne' },
            ] : [
              { value: String(stats.total), label: dict.availability.stats.total },
              { value: String(stats.available), label: dict.availability.stats.available, accent: true },
              { value: stats.typologies.join(' · '), label: dict.availability.typology },
              {
                value: `${stats.minArea.toFixed(0)} – ${stats.maxArea.toFixed(0)} m²`,
                label: dict.availability.table.sellable,
              },
            ]).map((s, i) => (
              <Reveal key={s.label} delay={i * 80} className="px-2 text-center">
                <p
                  className={`font-display text-[28px] font-light leading-tight lg:text-[34px] ${
                    s.accent ? 'text-gold-600' : 'text-ink'
                  }`}
                >
                  {s.value}
                </p>
                <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink/45">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ---- Le programme ---- */}
      <section id="programme" className="scroll-mt-[170px] bg-ivory py-24 lg:py-28">
        <div className="container-lux grid gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
          <div>
            <Reveal>
              <span className="eyebrow">{dict.project.overview}</span>
              <h2 className="h-display mt-4 text-[32px] sm:text-[42px]">{project.name}</h2>
              <div className="rule-gold mt-6" />
            </Reveal>
            <Reveal delay={110} className="prose-lux mt-7">
              <p>{t(project.description, locale)}</p>
            </Reveal>

            <Reveal delay={190}>
              <h3 className="mt-10 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink/45">
                {dict.project.highlights}
              </h3>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {project.highlights.map((h) => (
                  <li key={h.fr} className="flex items-start gap-3 text-[14px] text-ink/70">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                    {t(h, locale)}
                  </li>
                ))}
              </ul>
            </Reveal>

            {project.amenities.length > 0 && (
              <Reveal delay={250}>
                <h3 className="mt-10 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink/45">
                  {dict.project.amenities}
                </h3>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {project.amenities.map((a) => {
                    const Icon = AMENITY_ICONS[a];
                    const label = (dict.amenities as Record<string, string>)[a] ?? a;
                    return (
                      <span
                        key={a}
                        className="flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-[12.5px] text-ink/65"
                      >
                        {Icon && <Icon className="h-4 w-4 text-gold-500" />}
                        {label}
                      </span>
                    );
                  })}
                </div>
              </Reveal>
            )}
          </div>

          <Reveal delay={120}>
            <div className="overflow-hidden rounded-2xl border border-ink/8 bg-white">
              <h3 className="border-b border-ink/8 px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-ink/50">
                {dict.project.specs}
              </h3>
              <dl className="divide-y divide-ink/6 px-6">
                {project.specs.map((s) => (
                  <div key={s.label.fr} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <dt className="text-[12px] uppercase tracking-[0.1em] text-ink/45">{t(s.label, locale)}</dt>
                    <dd className="text-[14px] font-medium text-ink sm:text-end">{t(s.value, locale)}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <ProgressMeter value={project.progressPercent} locale={locale}/>
            {project.progress && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-ink/8 bg-white p-6">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink/50">
                  {dict.project.progress}
                </h3>
                <ul className="mt-5 space-y-5">
                  {project.progress.map((step) => (
                    <li key={step.label.fr}>
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="font-medium text-ink/75">{t(step.label, locale)}</span>
                        <span className="font-display text-[17px] text-gold-600">{step.percent}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand">
                        <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${step.percent}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {project.videoNote && (
              <div className="mt-6 flex items-start gap-4 rounded-2xl border border-ink/8 bg-white p-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-gradient text-ink">
                  <IconPlay className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink/45">
                    {dict.project.video}
                  </p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink/60">{t(project.videoNote, locale)}</p>
                </div>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* ---- Galerie ---- */}
      <section id="galerie" className="scroll-mt-[170px] bg-white py-24 lg:py-28">
        <div className="container-lux">
          <SectionHeading
            eyebrow={`${project.gallery.length} ${dict.project.photos}`}
            title={dict.project.gallery}
          />
          <div className="mt-12">
            <ProjectGallery
              locale={locale}
              projectSlug={project.slug}
              items={project.gallery.map((g) => ({ src: g.src, caption: t(g.caption, locale) }))}
              labels={{
                close: dict.common.close,
                previous: dict.common.previous,
                next: dict.common.next,
                of: dict.common.of,
              }}
            />
          </div>
        </div>
      </section>

      {/* ---- Maquette 3D interactive ---- */}
      {project.slug === 'diar-al-yassamine' && <div id="maquette" className="container-lux scroll-mt-[170px] py-12"><LazyMount minHeight={920} desktopMinHeight={960} loadingLabel={locale === 'ar' ? 'تحميل المجسم…' : locale === 'en' ? 'Loading the 3D model…' : 'Chargement de la maquette 3D…'}><YassamineMaquette locale={locale} lots={project.lots.map(({ ref, code, block, floor }) => ({ ref, code, block, floor }))} /></LazyMount></div>}
      {project.slug !== 'diar-al-yassamine' && project.massing && project.lots.length > 0 && (
        <section id="maquette" className="scroll-mt-[170px] bg-ink py-24 lg:py-28">
          <div className="container-lux">
            <SectionHeading
              eyebrow={dict.apartment.maquette}
              title={dict.maquette.title}
              subtitle={project.slug === 'residence-la-gloire' ? architectModelSubtitle[locale] : dict.maquette.subtitle}
              light
            />
            <div className="mt-12 overflow-hidden rounded-2xl ring-1 ring-white/10">
              <LazyMount minHeight={920} desktopMinHeight={960} loadingLabel={locale === 'ar' ? 'تحميل المجسم…' : locale === 'en' ? 'Loading the 3D model…' : 'Chargement de la maquette 3D…'}>
              <MaquetteSection
                locale={locale}
                projectSlug={project.slug}
                lots={project.lots}
                massing={project.massing}
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

      {/* ---- Disponibilité ---- */}
      {project.slug === 'diar-al-yassamine' && <YassaminePlanLibrary locale={locale} lots={project.lots} labels={dict.plan} statuses={dict.availability.legend} />}
      {project.lots.length > 0 ? (
        <section id="disponibilite" className="scroll-mt-[170px] bg-ivory py-24 lg:py-28">
          <div className="container-lux">
            <SectionHeading
              eyebrow={dict.project.availability}
              title={dict.availability.title}
              subtitle={dict.availability.subtitle}
            />
            <div className="mt-12">
              <AvailabilityPlan
                projectSlug={project.slug}
                blocks={project.blocks}
                lots={project.lots}
                locale={locale}
                labels={{
                  ...dict.availability,
                  ...(project.slug === 'diar-al-yassamine' ? { table: {
                    ...dict.availability.table,
                    sellable: locale === 'ar' ? 'مساحة الأرضية' : locale === 'en' ? 'Floor area' : 'Surface du plancher',
                    gross: locale === 'ar' ? 'المساحة خارج الجدران' : locale === 'en' ? 'Gross area' : 'Surface hors œuvre',
                  } } : {}),
                  all: dict.common.all,
                  downloadPlan: dict.project.downloadPlan,
                  sheet: dict.apartment.eyebrow,
                }}
              />
            </div>
          </div>
        </section>
      ) : project.status === 'ongoing' ? (
        <section id="disponibilite" className="scroll-mt-[170px] bg-ivory py-24">
          <div className="container-lux rounded-2xl border border-dashed border-ink/15 bg-white/60 p-12 text-center">
            <h2 className="h-display text-[28px]">{dict.availability.soonTitle}</h2>
            <p className="mx-auto mt-4 max-w-lg text-[14.5px] text-ink/55">{dict.availability.soonBody}</p>
          </div>
        </section>
      ) : null}

      {/* ---- Financement ---- */}
      {project.slug === 'diar-al-yassamine' && <YassamineFinancing locale={locale} />}
      {project.slug === 'residence-la-gloire' && <LaGloirePlanLibrary locale={locale} />}
      {project.status === 'ongoing' && (
        <section id="financement" className="scroll-mt-[170px] bg-white py-24 lg:py-28">
          <div className="container-lux">
            <SectionHeading
              eyebrow={dict.project.simulator}
              title={dict.simulator.title}
              subtitle={dict.simulator.subtitle}
            />
            <div className="mt-12">
              <CreditSimulator
                locale={locale}
                labels={dict.simulator}
                contactHref={`/${locale}/contact?project=${project.slug}`}
              />
            </div>
          </div>
        </section>
      )}

      {/* ---- Localisation ---- */}
      <section id="localisation" className="scroll-mt-[170px] bg-ivory py-24 lg:py-28">
        <div className="container-lux grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <Reveal>
            <span className="eyebrow">{dict.project.location}</span>
            <h2 className="h-display mt-4 text-[32px] sm:text-[40px]">{project.city}</h2>
            <div className="rule-gold mt-6" />
            <p className="mt-6 flex items-start gap-3 text-[15px] leading-relaxed text-ink/65">
              <IconPin className="mt-1 h-4 w-4 shrink-0 text-gold-500" />
              {t(project.address, locale)}
            </p>
            <a
              href={projectMap(project.slug, project.mapQuery, locale).externalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="btn-ghost mt-8"
            >
              {dict.project.openMap}
              <IconArrow className="h-4 w-4 rtl:rotate-180" />
            </a>
          </Reveal>

          <Reveal delay={120}>
            <div className="overflow-hidden rounded-2xl border border-ink/8 bg-white shadow-card">
              <iframe
                title={`${project.name} — ${project.city}`}
                src={projectMap(project.slug, project.mapQuery, locale).embedUrl}
                className="h-[420px] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- CTA + projet suivant ---- */}
      <section className="relative isolate overflow-hidden bg-ink">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={nextProject.cover} alt="" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/50" />
        </div>
        <div className="container-lux relative flex flex-col gap-10 py-20 lg:flex-row lg:items-center lg:justify-between">
          <Reveal>
            <span className="eyebrow !text-gold-300">{dict.home.cta.title}</span>
            <p className="mt-4 max-w-md text-[15px] text-white/60">{dict.home.cta.body}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={`/${locale}/contact?project=${project.slug}`} className="btn-gold">
                {dict.project.bookVisit}
                <IconArrow className="h-4 w-4 rtl:rotate-180" />
              </Link>
              <a href={`tel:${SITE.office.phones[0].replace(/\s/g, '')}`} className="btn-ghost-light">
                {SITE.office.phones[0]}
              </a>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <Link
              href={`/${locale}/projets/${nextProject.slug}`}
              className="group flex items-center gap-5 rounded-2xl border border-white/12 bg-white/[0.04] p-5 transition hover:border-gold-400/50"
            >
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold-300">
                  {dict.project.next}
                </p>
                <p className="mt-1.5 font-display text-[24px] font-light text-white">{nextProject.name}</p>
              </div>
              <IconArrow className="h-5 w-5 shrink-0 text-white/50 transition-transform group-hover:translate-x-1 rtl:rotate-180" />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
