import type { Metadata, Viewport } from 'next';
import PwaInstall from '@/components/site/PwaInstall';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Analytics } from '@vercel/analytics/next';
import '../globals.css';
import { isLocale, localeMeta, locales, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { SITE } from '@/lib/site';
import { jsonLd, organization } from '@/lib/seo';
import { getCompanySite } from '@/lib/company';

export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#111315'};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(isLocale(locale) ? locale : 'fr');
  return {
    metadataBase: new URL(SITE.url),
    manifest:'/manifest.webmanifest',
    appleWebApp:{capable:true,title:'IMF Immobilier',statusBarStyle:'default'},
    title: { default: dict.meta.title, template: `%s — ${SITE.name}` },
    description: dict.meta.description,
    keywords: locale === 'ar'
      ? ['عقارات تونس','شقق للبيع تونس','شقق للبيع صفاقس','باعث عقاري تونس','فوبرولوس','تونسيون بالخارج']
      : locale === 'en'
        ? ['Tunisia real estate','apartments for sale Tunis','apartments for sale Sfax','property developer Tunisia','Tunisians abroad property']
        : ['immobilier Tunisie','appartement à vendre Tunis','appartement à vendre Sfax','promoteur immobilier Tunisie','FOPROLOS','immobilier tunisien à l’étranger'],
    category: 'real estate',
    creator: SITE.legalName,
    publisher: SITE.legalName,
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      url: SITE.url,
      siteName: `${SITE.name} — ${SITE.legalName}`,
      images: ['/media/la-gloire/hero.jpg'],
      type: 'website',
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    icons: { icon: [{ url: '/icon.png', type: 'image/png' }, { url: '/favicon.svg' }] },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const meta = localeMeta[locale as Locale];
  const company = (await getCompanySite());
  const companySchema = {...organization, name:company.legalName, email:company.email, telephone:company.office.phones[0], address:{...organization.address,streetAddress:company.office.line1,addressLocality:company.office.line2}, contactPoint:{...organization.contactPoint,telephone:company.office.phones[0]}};

  return (
    <html lang={meta.htmlLang} dir={meta.dir} suppressHydrationWarning>
      <head>
        <meta name="geo.region" content="TN" />
        <meta name="geo.placename" content="Sfax, Tunis" />
      </head>
      <body className="font-sans">
        {children}
        <PwaInstall locale={locale}/>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(companySchema) }} />
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  );
}
