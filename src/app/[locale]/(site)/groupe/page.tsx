import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { getProjects } from '@/lib/db';
import { SITE } from '@/lib/site';
import { getCompanySite } from '@/lib/company';
import { alternates } from '@/lib/seo';
import Reveal from '@/components/Reveal';
import PageHero from '@/components/site/PageHero';
import SectionHeading from '@/components/site/SectionHeading';
import { IconArrow, IconBuilding, IconSparkle, IconChart, IconShield, IconPhone } from '@/components/Icons';

const VALUE_ICONS = [IconShield, IconChart, IconSparkle, IconBuilding];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(isLocale(locale) ? locale : 'fr');
  return { title: dict.group.title, description: dict.group.lead, alternates: alternates(isLocale(locale) ? locale : 'fr', '/groupe') };
}

export default async function GroupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const SITE = (await getCompanySite());
  const projects = (await getProjects());

  return (
    <>
      <PageHero
        compact
        eyebrow={dict.group.eyebrow}
        title={dict.group.title}
        subtitle={dict.group.lead}
        image="/media/zephyr/ext-1.jpg"
        breadcrumb={[
          { label: dict.nav.home, href: `/${locale}` },
          { label: dict.nav.group, href: `/${locale}/groupe` },
        ]}
      />

      {/* ---- Histoire ---- */}
      <section className="bg-ivory py-24 lg:py-32">
        <div className="container-lux grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <Reveal>
              <span className="eyebrow">{dict.group.storyTitle}</span>
              <div className="rule-gold mt-5" />
            </Reveal>
            <Reveal delay={110} className="prose-lux mt-7">
              <p className="!text-[17px] !leading-[1.85] !text-ink/80">{dict.group.story1}</p>
              <p>{dict.group.story2}</p>
            </Reveal>
            <Reveal delay={200}>
              <Link href={`/${locale}/projets`} className="btn-ghost mt-4">
                {dict.nav.projects}
                <IconArrow className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </Reveal>
          </div>

          <Reveal delay={90} className="grid grid-cols-2 gap-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
              <Image src="/media/diar-al-andalous-1/facade-1.jpg" alt="" fill sizes="25vw" className="object-cover" />
            </div>
            <div className="relative mt-10 aspect-[3/4] overflow-hidden rounded-2xl">
              <Image src="/media/marassim/hall-1.jpg" alt="" fill sizes="25vw" className="object-cover" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Chiffres ---- */}
      <section className="bg-ink py-16">
        <div className="container-lux">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-300">
            {dict.group.figuresTitle}
          </p>
          <div className="mt-10 grid grid-cols-2 gap-y-10 lg:grid-cols-4">
            {[
              { value: `${SITE.figures.years}+`, label: dict.home.stats.years },
              { value: `${projects.length}`, label: dict.home.stats.projects },
              { value: `${SITE.figures.units}+`, label: dict.home.stats.units },
              { value: `${SITE.figures.cities}`, label: dict.home.stats.cities },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 90} className="text-center">
                <p className="font-display text-[46px] font-light leading-none text-white lg:text-[58px]">{s.value}</p>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Engagements ---- */}
      <section className="bg-white py-24 lg:py-32">
        <div className="container-lux">
          <SectionHeading eyebrow={dict.group.eyebrow} title={dict.group.valuesTitle} align="center" />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {dict.group.values.map((v, i) => {
              const Icon = VALUE_ICONS[i] ?? IconSparkle;
              return (
                <Reveal key={v.title} delay={i * 100}>
                  <div className="h-full rounded-2xl border border-ink/8 bg-ivory p-7 transition duration-500 hover:border-gold-300 hover:bg-white hover:shadow-card">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-gold-gradient text-ink">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-6 font-display text-[22px] font-light">{v.title}</h3>
                    <p className="mt-3 text-[13.5px] leading-[1.8] text-ink/55">{v.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- Métiers ---- */}
      <section className="bg-ivory py-24 lg:py-28">
        <div className="container-lux">
          <SectionHeading eyebrow={dict.group.expertiseTitle} title={dict.group.expertiseTitle} />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {dict.group.expertise.map((e, i) => (
              <Reveal key={e.title} delay={i * 110}>
                <div className="h-full rounded-2xl bg-white p-8 shadow-card ring-1 ring-ink/5">
                  <span className="font-display text-[40px] font-light leading-none text-gold-300">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-5 font-display text-[24px] font-light">{e.title}</h3>
                  <p className="mt-3 text-[14px] leading-[1.8] text-ink/55">{e.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="bg-ink py-20">
        <div className="container-lux flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
          <Reveal>
            <h2 className="h-display max-w-lg text-[30px] text-white sm:text-[38px]">{dict.group.ctaTitle}</h2>
            <p className="mt-4 max-w-md text-[15px] text-white/55">{dict.group.ctaBody}</p>
          </Reveal>
          <Reveal delay={110} className="flex flex-col gap-3 sm:flex-row">
            <Link href={`/${locale}/contact`} className="btn-gold">
              {dict.nav.contact}
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
