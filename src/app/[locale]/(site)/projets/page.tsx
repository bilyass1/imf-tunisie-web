import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { getProjects, lotStats } from '@/lib/db';
import { t } from '@/lib/format';
import { alternates } from '@/lib/seo';
import PageHero from '@/components/site/PageHero';
import ProjectsExplorer, { type ProjectSummary } from '@/components/site/ProjectsExplorer';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(isLocale(locale) ? locale : 'fr');
  return { title: dict.projects.title, description: dict.projects.subtitle, alternates: alternates(isLocale(locale) ? locale : 'fr', '/projets') };
}

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  const summaries: ProjectSummary[] = getProjects().map((p) => {
    const stats = lotStats(p.lots);
    return {
      slug: p.slug,
      name: p.name,
      subtitle: t(p.subtitle, locale),
      city: p.city,
      cover: p.cover,
      status: p.status,
      foprolos: Boolean(p.foprolos),
      typologies: stats.typologies,
      total: stats.total,
      available: stats.available,
      minArea: stats.minArea,
    };
  });

  return (
    <>
      <PageHero
        compact
        eyebrow={dict.nav.projects}
        title={dict.projects.title}
        subtitle={dict.projects.subtitle}
        image="/media/la-gloire/facade-sunset-1.jpg"
        breadcrumb={[
          { label: dict.nav.home, href: `/${locale}` },
          { label: dict.nav.projects, href: `/${locale}/projets` },
        ]}
      />

      <section className="bg-ivory pb-24">
        <div className="container-lux">
          <Suspense fallback={<p className="py-24 text-center text-ink/40">{dict.common.loading}</p>}>
            <ProjectsExplorer
              projects={summaries}
              locale={locale}
              labels={{
                all: dict.projects.filters.all,
                status: dict.projects.filters.status,
                city: dict.projects.filters.city,
                typology: dict.projects.filters.typology,
                search: dict.projects.filters.search,
                reset: dict.projects.filters.reset,
                results: dict.projects.filters.results,
                noResult: dict.projects.filters.noResult,
                foprolos: dict.projects.filters.foprolos,
                statusLabels: dict.projects.status,
                sold: dict.projects.sold,
                available: dict.projects.available,
                view: dict.projects.view,
                lots: dict.projects.lots,
                from: dict.projects.from,
              }}
            />
          </Suspense>
        </div>
      </section>
    </>
  );
}
