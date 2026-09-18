import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/config';
import { SITE } from '@/lib/site';
import { getProjects, getNews } from '@/lib/db';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ['', '/groupe', '/contact', '/projets', '/actualites'];
  for (const article of (await getNews())) paths.push(`/actualites/${article.slug}`);
  for (const project of (await getProjects())) {
    paths.push(`/projets/${project.slug}`);
    for (const lot of project.lots) paths.push(`/projets/${project.slug}/appartements/${lot.ref}`);
  }
  return paths.flatMap(path => locales.map(locale => ({ url: `${SITE.url}/${locale}${path}`, alternates: { languages: Object.fromEntries(locales.map(l => [l, `${SITE.url}/${l}${path}`])) } })));
}
