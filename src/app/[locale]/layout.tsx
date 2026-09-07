import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import '../globals.css';
import { isLocale, localeMeta, locales, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { SITE } from '@/lib/site';

/**
 * Les polices sont chargées via la feuille de style Google Fonts.
 * Pour un hébergement 100 % autonome (sans requête vers Google), voir
 * la section « Polices » du README : il suffit de déposer les .woff2 dans
 * /public/fonts et de remplacer ce <link> par des @font-face.
 */
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Jost:wght@300;400;500;600&family=Cairo:wght@300;400;600;700&display=swap';

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
    title: { default: dict.meta.title, template: `%s — ${SITE.name}` },
    description: dict.meta.description,
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      url: SITE.url,
      siteName: `${SITE.name} — ${SITE.legalName}`,
      images: ['/media/la-gloire/hero.jpg'],
      type: 'website',
    },
    alternates: { languages: { fr: '/fr', en: '/en', ar: '/ar' } },
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

  return (
    <html lang={meta.htmlLang} dir={meta.dir} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS_HREF} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
