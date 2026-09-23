import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import { SITE } from '@/lib/site';
import { getCompanySite } from '@/lib/company';
import { PropertySelectionProvider } from '@/components/site/PropertySelection';

export const dynamic = 'force-dynamic';

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);
  const SITE=(await getCompanySite());

  return (
    <PropertySelectionProvider><div className="flex min-h-screen flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-5 focus:py-3 focus:text-ink">
        {locale === 'ar' ? 'الانتقال إلى المحتوى' : locale === 'en' ? 'Skip to content' : 'Aller au contenu'}
      </a>
      <Header
        locale={locale as Locale}
        transparent
        phone={SITE.office.phones[0]}
        labels={{
          home: dict.nav.home,
          group: dict.nav.group,
          projects: dict.nav.projects,
          news: dict.nav.news,
          contact: dict.nav.contact,
          clientArea: dict.nav.clientArea,
          quote: dict.nav.quote,
          menu: dict.nav.menu,
          close: dict.nav.close,
        }}
      />
      <main id="main-content" tabIndex={-1} className="flex-1 scroll-mt-24">{children}</main>
      <Footer locale={locale as Locale} dict={dict} />
    </div></PropertySelectionProvider>
  );
}
