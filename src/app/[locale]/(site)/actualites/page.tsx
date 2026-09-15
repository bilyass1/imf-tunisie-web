import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { getNews } from '@/lib/db';
import { t, formatDate } from '@/lib/format';
import Reveal from '@/components/Reveal';
import PageHero from '@/components/site/PageHero';
import { IconArrow, IconCalendar } from '@/components/Icons';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(isLocale(locale) ? locale : 'fr');
  return { title: dict.news.title, description: dict.news.subtitle };
}

export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const news = [...getNews()].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <PageHero
        compact
        eyebrow={dict.nav.news}
        title={dict.news.title}
        subtitle={dict.news.subtitle}
        image="/media/diar-al-yassamine/3d-8.jpg?v=photo-20260916"
        breadcrumb={[
          { label: dict.nav.home, href: `/${locale}` },
          { label: dict.nav.news, href: `/${locale}/actualites` },
        ]}
      />

      <section className="bg-ivory py-20 lg:py-28">
        <div className="container-lux">
          {news.length === 0 ? (
            <p className="py-20 text-center text-ink/45">{dict.news.empty}</p>
          ) : (
            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {news.map((item, i) => (
                <Reveal key={item.slug} delay={i * 100}>
                  <Link
                    href={`/${locale}/actualites/${item.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lux"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={item.image}
                        alt={t(item.title, locale)}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.06]"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-600">
                        <IconCalendar className="h-3.5 w-3.5" />
                        {formatDate(item.date, locale)}
                      </p>
                      <h2 className="mt-3 font-display text-[24px] font-light leading-snug">{t(item.title, locale)}</h2>
                      <p className="mt-3 flex-1 text-[14px] leading-[1.8] text-ink/55">{t(item.excerpt, locale)}</p>
                      <span className="mt-5 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink transition group-hover:text-gold-600">
                        {dict.news.readMore}
                        <IconArrow className="h-4 w-4 rtl:rotate-180" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
