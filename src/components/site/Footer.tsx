import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/getDictionary';
import { SITE } from '@/lib/site';
import { LogoMark } from '@/components/Logo';
import { IconPin, IconPhone, IconMail, IconFacebook, IconInstagram, IconLinkedin } from '@/components/Icons';
import { getProjects } from '@/lib/db';
import { getCompanySite } from '@/lib/company';

export default async function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const SITE=(await getCompanySite());
  const projects = await getProjects();
  const year = new Date().getFullYear();
  const socialLinks = [
    { href: SITE.social.facebook, Icon: IconFacebook, label: 'Facebook' },
    { href: SITE.social.instagram, Icon: IconInstagram, label: 'Instagram' },
    { href: SITE.social.linkedin, Icon: IconLinkedin, label: 'LinkedIn' },
  ].filter(({href}) => !/^https:\/\/(www\.)?(facebook|instagram|linkedin)\.com\/?$/i.test(href));

  return (
    <footer className="bg-ink text-white/70">
      <div className="container-lux grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:py-20">
        <div>
          <div className="flex items-center gap-3">
            <LogoMark className="h-11 w-auto" light />
            <span className="font-display text-2xl font-semibold tracking-[0.06em] text-white">IMF</span>
          </div>
          <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-white/70">{SITE.about??dict.footer.about}</p>
          {socialLinks.length > 0 && <div className="mt-6 flex gap-3">
            {socialLinks.map(({ href, Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={label}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/60 transition hover:border-gold-400 hover:text-gold-300"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>}
        </div>

        <div>
          <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-300">
            {dict.footer.navigation}
          </h3>
          <ul className="space-y-3 text-[14px]">
            {[
              { label: dict.nav.home, href: `/${locale}` },
              { label: dict.nav.group, href: `/${locale}/groupe` },
              { label: dict.nav.projects, href: `/${locale}/projets` },
              { label: locale === 'ar' ? 'البحث عن شقة' : locale === 'en' ? 'Find an apartment' : 'Trouver un appartement', href: `/${locale}/recherche` },
              { label: locale === 'ar' ? 'اختياراتي' : locale === 'en' ? 'My selection' : 'Ma sélection', href: `/${locale}/selection` },
              { label: locale === 'ar' ? 'أدلة عقارية' : locale === 'en' ? 'Property guides' : 'Guides immobiliers', href: `/${locale}/guides` },
              { label: dict.nav.news, href: `/${locale}/actualites` },
              { label: dict.nav.contact, href: `/${locale}/contact` },
              { label: dict.nav.clientArea, href: `/${locale}/espace-client` },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/70 transition hover:text-gold-300">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-300">
            {dict.footer.projectsCol}
          </h3>
          <ul className="space-y-3 text-[14px]">
            {projects.map((p) => (
              <li key={p.slug}>
                <Link href={`/${locale}/projets/${p.slug}`} className="text-white/70 transition hover:text-gold-300">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-300">
            {dict.footer.contactCol}
          </h3>
          <ul className="space-y-4 text-[14px] text-white/70">
            <li className="flex gap-3">
              <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
              <span>
                {SITE.office.line1}
                <br />
                {SITE.office.line2}
              </span>
            </li>
            <li className="flex gap-3">
              <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
              <span>{SITE.tunisOffice.line1}<br />{SITE.tunisOffice.line2}</span>
            </li>
            <li className="flex gap-3">
              <IconPhone className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
              <span className="flex flex-col">
                {SITE.office.phones.map((p) => (
                  <a key={p} href={`tel:${p.replace(/\s/g, '')}`} className="transition hover:text-gold-300">
                    {p}
                  </a>
                ))}
              </span>
            </li>
            <li className="flex gap-3">
              <IconMail className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
              <a href={`mailto:${SITE.email}`} className="transition hover:text-gold-300">
                {SITE.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-lux flex flex-col items-center justify-between gap-3 py-6 text-[12px] text-white/65 md:flex-row">
          <p>
            © {year} {SITE.legalName}. {dict.footer.rights}
          </p>
          <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            <span>
              {dict.footer.vat} : {SITE.legal.vat}
            </span>
            <span>
              {dict.footer.rc} : {SITE.legal.rc}
            </span>
            <a href={SITE.agency.url} target="_blank" rel="noreferrer noopener" className="transition hover:text-gold-300">
              {dict.footer.madeBy}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
