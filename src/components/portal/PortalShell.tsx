import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Locale } from '@/i18n/config';
import { LogoMark } from '@/components/Logo';
import { logoutAction } from '@/lib/actions';
import { IconLogout, IconArrowLeft } from '@/components/Icons';

export interface PortalNavItem {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
}

export default function PortalShell({
  locale,
  title,
  subtitle,
  userName,
  nav,
  active,
  backLabel,
  logoutLabel,
  children,
  accent = 'client',
  wide = false,
}: {
  locale: Locale;
  title: string;
  subtitle?: string;
  userName: string;
  nav: PortalNavItem[];
  active: string;
  backLabel: string;
  logoutLabel: string;
  children: ReactNode;
  accent?: 'client' | 'admin';
  wide?: boolean;
}) {
  const navigation = <nav aria-label={title} className="grid gap-1.5 p-2 sm:grid-cols-2 xl:grid-cols-1 xl:p-0">
    {nav.map(item => <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-[13.5px] font-medium transition ${active === item.key ? 'bg-ink text-white shadow-card' : 'text-ink/60 hover:bg-white hover:text-gold-600'}`}>
      <span className={`shrink-0 ${active === item.key ? 'text-gold-300' : 'text-ink/35'}`}>{item.icon}</span>{item.label}
    </Link>)}
  </nav>;
  return (
    <div className="portal-shell min-h-screen bg-ivory">
      <header className="border-b border-ink/8 bg-white">
        <div className={`${wide ? 'max-w-[1720px]' : ''} container-lux flex h-[72px] items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <LogoMark className="h-8 w-auto" />
            <div className="leading-none">
              <p className="font-display text-[19px] font-semibold tracking-[0.05em]">IMF</p>
              <p className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-gold-600">
                {accent === 'admin' ? 'Espace commercial' : 'Espace client'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}`}
              className="hidden items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink/45 transition hover:text-gold-600 sm:flex"
            >
              <IconArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {backLabel}
            </Link>
            <span className="hidden max-w-[180px] truncate text-[13px] font-medium text-ink/70 md:block">
              {userName}
            </span>
            <form action={logoutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                aria-label={logoutLabel}
                className="flex items-center gap-2 rounded-full border border-ink/12 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink/60 transition hover:border-gold-400 hover:text-gold-600"
              >
                <IconLogout className="h-4 w-4 rtl:rotate-180" />
                <span className="hidden sm:inline">{logoutLabel}</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className={`${wide ? 'max-w-[1720px]' : ''} container-lux grid min-w-0 gap-5 py-5 sm:gap-6 sm:py-8 xl:grid-cols-[236px_minmax(0,1fr)] xl:py-12`}>
        <aside className="min-w-0">
          <div className="lg:sticky lg:top-8">
            <h1 className="h-display text-[28px] leading-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-[13.5px] text-ink/50">{subtitle}</p>}
            <details key={active} className="mt-4 rounded-xl border border-ink/10 bg-white xl:hidden">
              <summary className="cursor-pointer px-4 py-3 font-medium xl:hidden">
                <span className="text-gold-700">{locale === 'ar' ? 'القائمة' : 'Menu'}</span>
                <span className="ms-3 text-sm">{nav.find(item => item.key === active)?.label}</span>
              </summary>
              {navigation}
            </details>
            <div className="mt-7 hidden xl:block">{navigation}</div>
          </div>
        </aside>

        <main className="portal-content min-w-0">{children}</main>
      </div>
    </div>
  );
}
