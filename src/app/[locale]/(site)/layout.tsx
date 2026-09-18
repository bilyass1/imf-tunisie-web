import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import { SITE } from '@/lib/site';
import { getCompanySite } from '@/lib/company';

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
  const SITE=getCompanySite();

  return (
    <div className="flex min-h-screen flex-col">
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
      <main className="flex-1">{children}</main>
      <Footer locale={locale as Locale} dict={dict} />
    </div>
  );
}
