'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/i18n/config';
import Logo from '@/components/Logo';
import LanguageSwitcher from './LanguageSwitcher';
import { IconMenu, IconClose, IconPhone, IconUser } from '@/components/Icons';

export interface HeaderLabels {
  home: string;
  group: string;
  projects: string;
  news: string;
  contact: string;
  clientArea: string;
  quote: string;
  menu: string;
  close: string;
}

export default function Header({
  locale,
  labels,
  phone,
  transparent = false,
}: {
  locale: Locale;
  labels: HeaderLabels;
  phone: string;
  transparent?: boolean;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuPanel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); menuButton.current?.focus(); }
      if (e.key === 'Tab') {
        const items = [menuButton.current, ...Array.from(menuPanel.current?.querySelectorAll<HTMLElement>('a') ?? [])].filter(Boolean) as HTMLElement[];
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', close);
    const desktop = window.matchMedia('(min-width: 1280px)');
    const onDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', onDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', close);
      desktop.removeEventListener('change', onDesktop);
    };
  }, [open]);

  const links = [
    { label: labels.home, href: `/${locale}` },
    { label: labels.group, href: `/${locale}/groupe` },
    { label: labels.projects, href: `/${locale}/projets` },
    { label: locale === 'ar' ? 'بحث' : locale === 'en' ? 'Search' : 'Rechercher', href: `/${locale}/recherche` },
    { label: locale === 'ar' ? 'اختياراتي' : locale === 'en' ? 'Saved' : 'Ma sélection', href: `/${locale}/selection` },
    { label: labels.news, href: `/${locale}/actualites` },
    { label: labels.contact, href: `/${locale}/contact` },
  ];

  // These pages start on an ivory background rather than an image hero.
  const plainPage = /^\/(fr|en|ar)\/(recherche|selection|guides)(\/|$)/.test(pathname)
    || pathname.includes('/plans/');
  const solid = scrolled || !transparent || open || plainPage;
  const light = !solid;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          solid ? 'border-b border-ink/8 bg-ivory/92 backdrop-blur-xl' : 'bg-gradient-to-b from-black/55 to-transparent'
        }`}
      >
        <div dir="ltr" className="flex h-[76px] w-full items-center justify-between gap-4 px-5 sm:px-8 lg:h-[84px] lg:px-10">
          <div className="shrink-0">
            <Logo locale={locale} light={light} />
          </div>

          <nav dir={locale === 'ar' ? 'rtl' : 'ltr'} className="hidden flex-1 items-center justify-center gap-3 xl:flex 2xl:gap-5">
            {links.map((link) => {
              const active = pathname === link.href || (link.href !== `/${locale}` && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative whitespace-nowrap text-[12.5px] font-medium uppercase tracking-[0.14em] transition ${
                    light ? 'text-white/85 hover:text-gold-200' : 'text-ink/70 hover:text-gold-600'
                  } ${active ? (light ? 'text-gold-200' : 'text-gold-600') : ''}`}
                >
                  {link.label}
                  {active && <span className="absolute -bottom-2 start-0 h-px w-full bg-gold-gradient" />}
                </Link>
              );
            })}
          </nav>

          <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="flex shrink-0 items-center gap-2.5">
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className={`hidden items-center gap-2 whitespace-nowrap text-[12.5px] font-medium tracking-wide min-[1700px]:flex ${
                light ? 'text-white/85 hover:text-gold-200' : 'text-ink/70 hover:text-gold-600'
              }`}
            >
              <IconPhone className="h-4 w-4" />
              {phone}
            </a>

            <LanguageSwitcher locale={locale} light={light} />

            <Link
              href={`/${locale}/espace-client`}
              className={`hidden items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition sm:flex ${
                light
                  ? 'border-white/25 text-white/85 hover:border-gold-300 hover:text-gold-200'
                  : 'border-ink/15 text-ink/70 hover:border-gold-400 hover:text-gold-600'
              }`}
            >
              <IconUser className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only md:not-sr-only xl:sr-only min-[1700px]:not-sr-only">{labels.clientArea}</span>
            </Link>

            <Link href={`/${locale}/contact`} className="btn-gold hidden whitespace-nowrap !px-5 !py-2.5 !text-[11px] lg:inline-flex">
              {labels.quote}
            </Link>

            <button
              ref={menuButton}
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? labels.close : labels.menu}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className={`grid h-10 w-10 place-items-center rounded-full border transition xl:hidden ${
                light ? 'border-white/25 text-white' : 'border-ink/15 text-ink'
              }`}
            >
              {open ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Menu mobile */}
      <div
        ref={menuPanel}
        id="mobile-menu"
        inert={!open}
        aria-hidden={!open}
        className={`fixed inset-0 z-40 overflow-y-auto bg-ink transition-all duration-500 xl:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="container-lux flex min-h-full flex-col justify-center gap-1 pb-8 pt-24">
          {links.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: `${80 + i * 55}ms` }}
              className={`border-b border-white/10 py-3 font-display text-2xl font-light text-white transition-all duration-500 ${
                open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-8 flex flex-col gap-3">
            <Link href={`/${locale}/espace-client`} className="btn-ghost-light w-full">
              {labels.clientArea}
            </Link>
            <Link href={`/${locale}/contact`} className="btn-gold w-full">
              {labels.quote}
            </Link>
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="mt-2 flex items-center justify-center gap-2 text-white/70">
              <IconPhone className="h-4 w-4" /> {phone}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
