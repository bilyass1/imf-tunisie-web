import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { getProjects, lotStats } from '@/lib/db';
import { SITE } from '@/lib/site';
import { t } from '@/lib/format';
import Reveal from '@/components/Reveal';
import SectionHeading from '@/components/site/SectionHeading';
import ProjectCard from '@/components/site/ProjectCard';
import { IconArrow, IconChart, IconSparkle, IconShield, IconUser, IconPhone } from '@/components/Icons';

const WHY_ICONS = [IconChart, IconSparkle, IconShield, IconUser];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  const projects = getProjects();
  const ongoing = projects.filter((p) => p.status === 'ongoing');
  const delivered = projects.filter((p) => p.status === 'delivered');
  const hero = ongoing[0] ?? projects[0];

  const totalLots = projects.reduce((sum, p) => sum + p.lots.length, 0);
  const totalAvailable = projects.reduce((sum, p) => sum + lotStats(p.lots).available, 0);

  return (
    <>
      {/* ---------------------------- HERO ---------------------------- */}
      <section className="relative isolate flex min-h-[92svh] items-end overflow-hidden bg-ink">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Image src={hero.heroImage} alt="" fill priority quality={90} sizes="100vw" className="object-cover object-[60%_center]" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/55 to-ink/10 rtl:rotate-180" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-ink/20" />
          <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_100%,rgba(201,162,75,0.18),transparent_70%)]" />
        </div>

        <div className="container-lux relative pb-12 pt-36 lg:pb-20 lg:pt-44">
          <Reveal>
            <span className="eyebrow !text-gold-300">{dict.home.hero.eyebrow}</span>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="h-display mt-6 max-w-4xl text-balance text-[44px] leading-[1.06] text-white sm:text-[62px] lg:text-[76px]">
              {dict.home.hero.title1}
              <br />
              <span className="bg-gold-gradient bg-clip-text text-transparent">{dict.home.hero.title2}</span>
            </h1>
          </Reveal>

          <Reveal delay={190}>
            <p className="mt-7 max-w-xl text-[16px] leading-[1.85] text-white/80">{dict.home.hero.subtitle}</p>
          </Reveal>

          <Reveal delay={280}>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href={`/${locale}/projets`} className="btn-gold">
                {dict.home.hero.cta1}
                <IconArrow className="h-4 w-4 rtl:rotate-180" />
              </Link>
              <Link href={`/${locale}/projets/${hero.slug}#disponibilite`} className="btn-ghost-light">
                {dict.home.hero.cta2}
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gold-gradient opacity-70" />
      </section>

      {/* ---------------------------- STATS ---------------------------- */}
      <section className="border-b border-ink/8 bg-white">
        <div className="container-lux grid grid-cols-2 divide-ink/8 py-10 sm:divide-x lg:grid-cols-4">
          {[
            { value: `${SITE.figures.years}+`, label: dict.home.stats.years },
            { value: `${projects.length}`, label: dict.home.stats.projects },
            { value: `${totalLots || SITE.figures.units}+`, label: dict.home.stats.units },
            { value: `${SITE.figures.cities}`, label: dict.home.stats.cities },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 90} className="px-2 py-5 text-center sm:px-6">
              <p className="font-display text-[42px] font-light leading-none text-ink lg:text-[52px]">{s.value}</p>
              <p className="mt-3 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink/45">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------------------- INTRO ---------------------------- */}
      <section className="bg-ivory py-24 lg:py-32">
        <div className="container-lux grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/media/imf/siege.jpg"
                alt="Siège IMF — Immobilière Mseddi Frères"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-8 end-0 hidden w-56 rounded-2xl bg-ink p-6 text-white shadow-lux sm:block lg:-end-8">
              <p className="font-display text-[40px] font-light leading-none text-gold-300">{totalAvailable}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-white/50">
                {dict.projects.available} · {dict.projects.lots}
              </p>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <span className="eyebrow">{dict.home.intro.eyebrow}</span>
              <h2 className="h-display mt-4 text-[34px] sm:text-[44px]">{dict.home.intro.title}</h2>
              <div className="rule-gold mt-6" />
            </Reveal>
            <Reveal delay={120} className="prose-lux mt-7">
              <p>{dict.home.intro.body1}</p>
              <p>{dict.home.intro.body2}</p>
            </Reveal>
            <Reveal delay={210}>
              <Link href={`/${locale}/groupe`} className="btn-ghost mt-4">
                {dict.home.intro.cta}
                <IconArrow className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------ PROJETS EN COURS ---------------------- */}
      <section className="bg-white py-24 lg:py-32">
        <div className="container-lux">
          <SectionHeading
            eyebrow={dict.home.featured.eyebrow}
            title={dict.home.featured.title}
            subtitle={dict.home.featured.subtitle}
            action={
              <Link href={`/${locale}/projets`} className="btn-ghost">
                {dict.home.featured.all}
                <IconArrow className="h-4 w-4 rtl:rotate-180" />
              </Link>
            }
          />

          <div className={`mt-14 grid gap-6 sm:grid-cols-2 ${ongoing.length > 2 ? 'lg:grid-cols-3' : ''}`}>
            {ongoing.map((project, i) => (
              <Reveal key={project.slug} delay={i * 110}>
                <ProjectCard project={project} locale={locale} dict={dict} priority={i === 0} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- POURQUOI -------------------------- */}
      <section className="relative isolate overflow-hidden bg-ink py-24 lg:py-32">
        <div className="absolute inset-0 opacity-[0.14]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/la-gloire/facade-nuit-1.jpg" alt="" className="h-full w-full object-cover" />
        </div>
        <div className="container-lux relative">
          <SectionHeading
            eyebrow={dict.home.why.eyebrow}
            title={dict.home.why.title}
            align="center"
            light
          />

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {dict.home.why.items.map((item, i) => {
              const Icon = WHY_ICONS[i] ?? IconSparkle;
              return (
                <Reveal key={item.title} delay={i * 100}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/[0.035] p-7 backdrop-blur-sm transition duration-500 hover:border-gold-400/40 hover:bg-white/[0.06]">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-gold-gradient text-ink">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-6 font-display text-[22px] font-light text-white">{item.title}</h3>
                    <p className="mt-3 text-[13.5px] leading-[1.8] text-white/50">{item.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------- PROJETS LIVRÉS ----------------------- */}
      <section className="bg-ivory py-24 lg:py-32">
        <div className="container-lux">
          <SectionHeading
            eyebrow={dict.home.delivered.eyebrow}
            title={dict.home.delivered.title}
            subtitle={dict.home.delivered.subtitle}
            action={
              <Link href={`/${locale}/projets?status=delivered`} className="btn-ghost">
                {dict.home.delivered.all}
                <IconArrow className="h-4 w-4 rtl:rotate-180" />
              </Link>
            }
          />

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {delivered.map((project, i) => (
              <Reveal key={project.slug} delay={i * 90}>
                <ProjectCard project={project} locale={locale} dict={dict} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ CTA ----------------------------- */}
      <section className="relative isolate overflow-hidden bg-ink">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/la-gloire/patio-jour-1.jpg" alt="" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/55" />
        </div>
        <div className="container-lux relative flex flex-col items-start gap-8 py-20 lg:flex-row lg:items-center lg:justify-between lg:py-24">
          <Reveal>
            <span className="eyebrow !text-gold-300">{t(hero.subtitle, locale)}</span>
            <h2 className="h-display mt-4 max-w-xl text-[34px] text-white sm:text-[44px]">{dict.home.cta.title}</h2>
            <p className="mt-5 max-w-md text-[15px] text-white/55">{dict.home.cta.body}</p>
          </Reveal>
          <Reveal delay={120} className="flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/contact`} className="btn-gold">
              {dict.home.cta.button}
              <IconArrow className="h-4 w-4 rtl:rotate-180" />
            </Link>
            <a href={`tel:${SITE.office.phones[0].replace(/\s/g, '')}`} className="btn-ghost-light">
              <IconPhone className="h-4 w-4" />
              {SITE.office.phones[0]}
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
