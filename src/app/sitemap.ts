import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/config';
import { SITE } from '@/lib/site';
import { getProjects, getNews } from '@/lib/db';
import { LA_GLOIRE_DOCUMENTS } from '@/lib/la-gloire-documents';
import { propertyGuides } from '@/lib/property-guides';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ['', '/groupe', '/contact', '/projets', '/actualites', '/recherche', '/guides'];
  for (const guide of propertyGuides) paths.push(`/guides/${guide.slug}`);
  for (const article of (await getNews())) paths.push(`/actualites/${article.slug}`);
  for (const project of (await getProjects())) {
    paths.push(`/projets/${project.slug}`);
    for (const lot of project.lots) paths.push(`/projets/${project.slug}/appartements/${lot.ref}`);
  }
  for (const plan of LA_GLOIRE_DOCUMENTS) paths.push(`/projets/residence-la-gloire/plans/${plan.file}`);
  return paths.flatMap(path => locales.map(locale => ({ url: `${SITE.url}/${locale}${path}`, lastModified:propertyGuides.find(g=>path===`/guides/${g.slug}`)?.updated, alternates: { languages: {
    ...Object.fromEntries(locales.map(l => [l, `${SITE.url}/${l}${path}`])),
    'x-default':`${SITE.url}/fr${path}`,
  } } })));
}
