import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { getProjects } from '@/lib/db';
import { alternates, breadcrumbs, jsonLd } from '@/lib/seo';
import { cityCopy, cityTitle, cityDescription, cityListings, cityFaq, type City } from '@/lib/city-content';
import { floorLabel, formatArea, formatMoney } from '@/lib/format';
import { lotPath } from '@/lib/agent-content';
import ProjectCard from './ProjectCard';

export async function cityMetadata(params: Promise<{locale:string}>, city: City): Promise<Metadata> {
  const {locale}=await params;
  if(!isLocale(locale)) notFound();
  return {title:{absolute:cityTitle(city,locale)},description:cityDescription(city,locale),alternates:alternates(locale,`/appartements-${city}`)};
}
export default async function CityLanding({params,city}:{params:Promise<{locale:string}>;city:City}) {
  const {locale}=await params;
  if(!isLocale(locale)) notFound();
  const copy=cityCopy[locale];
  const dict=getDictionary(locale);
  const data=cityListings(await getProjects(),city);
  const questions=cityFaq(city,locale,data);
  const title=cityTitle(city,locale).replace(' | IMF','');
  return <article className="bg-ivory pb-20 pt-32">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd({'@context':'https://schema.org','@graph':[
      breadcrumbs([{name:copy.home,path:`/${locale}`},{name:title,path:`/${locale}/appartements-${city}`}]),
      {'@type':'FAQPage',mainEntity:questions.map(q=>({'@type':'Question',name:q.question,acceptedAnswer:{'@type':'Answer',text:q.answer}}))},
    ]})}} />
    <div className="container-lux">
      <nav aria-label={copy.home} className="mb-6 text-sm"><Link className="underline" href={`/${locale}`}>{copy.home}</Link></nav>
      <p className="eyebrow">IMF · {dict.nav.projects}</p>
      <h1 className="h-display mt-4 max-w-4xl text-4xl sm:text-6xl">{title}</h1>
      <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink/70">{copy.intro}</p>
      <div className="mt-7 flex flex-wrap gap-4"><Link className="btn-gold" href={`/${locale}/contact?intent=visit`}>{copy.visit}</Link><Link className="btn-ghost" href={`/${locale}/contact`}>{copy.contact}</Link></div>
      {data.minArea!==undefined && <div className="mt-10 rounded-2xl border border-ink/10 bg-white p-6"><h2 className="text-lg font-semibold">{copy.areas}</h2><p className="mt-3 font-display text-3xl">{formatArea(data.minArea,locale)} – {formatArea(data.maxArea,locale)}</p><p className="mt-2 text-sm text-ink/65">{copy.knownAreas}</p></div>}
      <section className="mt-14"><h2 className="font-display text-3xl">{copy.projects}</h2><div className="mt-7 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{data.projects.map(project=><div key={project.slug}><ProjectCard project={project} locale={locale} dict={dict}/><p className="mt-3 text-sm text-ink/70">{project.address[locale]}</p></div>)}</div></section>
      <section className="mt-14"><h2 className="font-display text-3xl">{copy.available} <span className="text-ink/50">({data.available.length})</span></h2><p className="mt-3 text-sm text-ink/65">{copy.confirm}</p>
        {!data.available.length && <p className="mt-6">{copy.empty}</p>}
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.available.map(({project,lot})=><div key={`${project.slug}/${lot.ref}`} className="rounded-2xl border border-ink/10 bg-white p-6"><p className="text-sm text-ink/60">{project.name}</p><h3 className="mt-2 font-display text-2xl">{lot.code} · {lot.typology}</h3><p className="mt-3 text-sm">{floorLabel(lot.floor,locale)}{lot.sellableArea ? ` · ${formatArea(lot.sellableArea,locale)}` : ''}</p><p className="mt-3 font-semibold">{lot.price ? formatMoney(lot.price,locale,3) : copy.request}</p><Link className="mt-5 inline-block underline underline-offset-4" href={lotPath(project,lot.ref,locale)}>{copy.details}</Link></div>)}</div>
      </section>
      <section className="mt-14 max-w-4xl"><h2 className="font-display text-3xl">{copy.faq}</h2>{questions.map(q=><div key={q.question} className="mt-5 rounded-2xl bg-white p-6"><h3 className="font-semibold">{q.question}</h3><p className="mt-3 leading-relaxed text-ink/75">{q.answer}</p></div>)}</section>
    </div>
  </article>;
}
