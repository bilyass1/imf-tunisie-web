import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, locales, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { getNews, getNewsItem } from '@/lib/db';
import { t, formatDate } from '@/lib/format';
import PageHero from '@/components/site/PageHero';
import { IconArrowLeft } from '@/components/Icons';

export function generateStaticParams() {
  return locales.flatMap((locale) => getNews().map((n) => ({ locale, slug: n.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const item = getNewsItem(slug);
  if (!item) return {};
  const l = (isLocale(locale) ? locale : 'fr') as Locale;
  return { title: t(item.title, l), description: t(item.excerpt, l) };
}

export default async function NewsItemPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const item = getNewsItem(slug);
  if (!item) notFound();

  return (
    <>
      <PageHero
        compact
        eyebrow={formatDate(item.date, locale)}
        title={t(item.title, locale)}
        image={item.image}
        breadcrumb={[
          { label: dict.nav.home, href: `/${locale}` },
          { label: dict.nav.news, href: `/${locale}/actualites` },
        ]}
      />

      <article className="bg-ivory py-20 lg:py-28">
        <div className="container-lux max-w-3xl">
          <p className="font-display text-[22px] font-light leading-[1.7] text-ink/80">{t(item.excerpt, locale)}</p>
          <div className="rule-gold my-8" />
          <div className="prose-lux">
            <p className="!text-[16px]">{t(item.body, locale)}</p>
          </div>

          <Link href={`/${locale}/actualites`} className="btn-ghost mt-12">
            <IconArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {dict.news.back}
          </Link>
        </div>
      </article>
    </>
  );
}
