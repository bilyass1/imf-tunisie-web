import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { getProjects } from '@/lib/db';
import { SITE } from '@/lib/site';
import Reveal from '@/components/Reveal';
import PageHero from '@/components/site/PageHero';
import ContactForm from '@/components/site/ContactForm';
import { IconPin, IconPhone, IconMail, IconClock } from '@/components/Icons';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(isLocale(locale) ? locale : 'fr');
  return { title: dict.contact.title, description: dict.contact.subtitle };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const projects = getProjects().map((p) => ({ slug: p.slug, name: p.name }));

  const infos = [
    {
      Icon: IconPin,
      label: dict.contact.info.office,
      lines: [SITE.office.line1, SITE.office.line2],
    },
    {
      Icon: IconPhone,
      label: dict.contact.info.commercial,
      lines: SITE.office.phones,
      hrefs: SITE.office.phones.map((p) => `tel:${p.replace(/\s/g, '')}`),
    },
    {
      Icon: IconPhone,
      label: dict.contact.info.technical,
      lines: [SITE.technicalPhone],
      hrefs: [`tel:${SITE.technicalPhone.replace(/\s/g, '')}`],
    },
    {
      Icon: IconMail,
      label: dict.contact.info.email,
      lines: [SITE.email],
      hrefs: [`mailto:${SITE.email}`],
    },
    {
      Icon: IconClock,
      label: dict.contact.info.hours,
      lines: [dict.contact.info.hoursValue],
    },
  ];

  return (
    <>
      <PageHero
        compact
        eyebrow={dict.nav.contact}
        title={dict.contact.title}
        subtitle={dict.contact.subtitle}
        image="/media/la-gloire/accueil-2.jpg"
        breadcrumb={[
          { label: dict.nav.home, href: `/${locale}` },
          { label: dict.nav.contact, href: `/${locale}/contact` },
        ]}
      />

      <section className="bg-ivory py-20 lg:py-28">
        <div className="container-lux grid gap-12 lg:grid-cols-[1fr_1.25fr] lg:gap-16">
          {/* ---- Coordonnées ---- */}
          <Reveal>
            <div className="rounded-2xl bg-ink p-8 text-white lg:p-10">
              <h2 className="font-display text-[28px] font-light">{SITE.legalName}</h2>
              <div className="rule-gold mt-5" />

              <ul className="mt-8 space-y-7">
                {infos.map((info) => (
                  <li key={info.label} className="flex gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 text-gold-400">
                      <info.Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/40">
                        {info.label}
                      </p>
                      <div className="mt-1.5 space-y-0.5 text-[14.5px] text-white/80">
                        {info.lines.map((line, i) =>
                          info.hrefs?.[i] ? (
                            <a key={line} href={info.hrefs[i]} className="block transition hover:text-gold-300">
                              {line}
                            </a>
                          ) : (
                            <p key={line}>{line}</p>
                          ),
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-10 border-t border-white/10 pt-6 text-[12px] text-white/35">
                <p>
                  {dict.footer.vat} : {SITE.legal.vat}
                </p>
                <p className="mt-1">
                  {dict.footer.rc} : {SITE.legal.rc}
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-ink/8 bg-white">
              <iframe
                title="IMF — Sfax"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  'Route Teniour Km 1, Sfax, Tunisie',
                )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                className="h-[280px] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </Reveal>

          {/* ---- Formulaire ---- */}
          <Reveal delay={110}>
            <div className="rounded-2xl bg-white p-8 shadow-card ring-1 ring-ink/5 lg:p-10">
              <span className="eyebrow">{dict.contact.formTitle}</span>
              <h2 className="h-display mt-4 text-[30px]">{dict.contact.title}</h2>
              <div className="rule-gold mt-5" />

              <div className="mt-8">
                <Suspense fallback={<p className="text-ink/40">{dict.common.loading}</p>}>
                  <ContactForm labels={dict.contact.form} projects={projects} />
                </Suspense>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
