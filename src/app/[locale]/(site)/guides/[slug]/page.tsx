import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, locales } from '@/i18n/config';
import { propertyGuides } from '@/lib/property-guides';
import { alternates,jsonLd } from '@/lib/seo';
import { SITE } from '@/lib/site';
export function generateStaticParams(){return locales.flatMap(locale=>propertyGuides.map(g=>({locale,slug:g.slug})));}
export async function generateMetadata({params}:{params:Promise<{locale:string;slug:string}>}):Promise<Metadata>{
  const {locale,slug}=await params;const l=isLocale(locale)?locale:'fr';const g=propertyGuides.find(g=>g.slug===slug);if(!g)return{};
  return {title:g.title[l],description:g.summary[l],alternates:alternates(l,`/guides/${slug}`),openGraph:{type:'article',title:g.title[l],description:g.summary[l],publishedTime:g.published,modifiedTime:g.updated,url:`${SITE.url}/${l}/guides/${slug}`}};
}
export default async function GuidePage({params}:{params:Promise<{locale:string;slug:string}>}){
  const {locale,slug}=await params;if(!isLocale(locale))notFound();const g=propertyGuides.find(g=>g.slug===slug);if(!g)notFound();
  const labels={fr:{guides:'Guides immobiliers',author:'Rédaction IMF',updated:'Mis à jour le',contents:'Dans ce guide',questions:'Questions fréquentes',sources:'Références',search:'Comparer les appartements',visit:'Parler de votre projet'},en:{guides:'Property guides',author:'IMF editorial team',updated:'Updated on',contents:'In this guide',questions:'Frequently asked questions',sources:'References',search:'Compare apartments',visit:'Discuss your project'},ar:{guides:'أدلة عقارية',author:'فريق تحرير IMF',updated:'آخر تحديث',contents:'في هذا الدليل',questions:'أسئلة شائعة',sources:'المراجع',search:'قارن الشقق',visit:'ناقش مشروعك'}}[locale];
  const url=`${SITE.url}/${locale}/guides/${slug}`;
  const breadcrumb=[{name:'IMF',item:`${SITE.url}/${locale}`},{name:labels.guides,item:`${SITE.url}/${locale}/guides`},{name:g.title[locale],item:url}];
  return <article className="bg-ivory pb-20 pt-32"><div className="container-lux max-w-4xl">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd({'@context':'https://schema.org','@graph':[
      {'@type':'Article','@id':`${url}#article`,headline:g.title[locale],description:g.summary[locale],inLanguage:locale,datePublished:g.published,dateModified:g.updated,mainEntityOfPage:url,author:{'@type':'Organization',name:labels.author,url:`${SITE.url}/${locale}/groupe`},publisher:{'@type':'Organization',name:SITE.legalName,url:SITE.url},citation:g.sources.map(s=>s.url.startsWith('/')?`${SITE.url}${s.url}`:s.url)},
      {'@type':'BreadcrumbList',itemListElement:breadcrumb.map((b,i)=>({'@type':'ListItem',position:i+1,...b}))},
      {'@type':'FAQPage',mainEntity:g.questions.map(q=>({'@type':'Question',name:q.question[locale],acceptedAnswer:{'@type':'Answer',text:q.answer[locale]}}))},
    ]})}}/>
    <nav aria-label={labels.guides} className="mb-6 text-sm"><Link className="underline" href={`/${locale}/guides`}>{labels.guides}</Link></nav>
    <h1 className="h-display text-4xl leading-tight sm:text-5xl">{g.title[locale]}</h1>
    <p className="mt-5 text-sm text-ink/65">{labels.author} · {labels.updated} <time dateTime={g.updated}>{g.updated}</time></p>
    <p className="my-8 text-xl leading-relaxed">{g.summary[locale]}</p>
    <nav aria-label={labels.contents} className="rounded-2xl border border-ink/10 bg-white p-6"><h2 className="font-semibold">{labels.contents}</h2><ol className="mt-4 list-inside list-decimal space-y-2">{g.sections.map((s,i)=><li key={i}><a className="underline underline-offset-4" href={`#section-${i+1}`}>{s.title[locale]}</a></li>)}</ol></nav>
    {g.sections.map((section,i)=><section className="mt-12 scroll-mt-28" id={`section-${i+1}`} key={i}><h2 className="font-display text-3xl">{section.title[locale]}</h2><p className="mt-5 text-lg leading-relaxed text-ink/80">{section.body[locale]}</p>{section.source&&<a href={section.source} className="mt-3 inline-block text-sm underline" target="_blank" rel="noopener noreferrer">{g.sources.find(s=>s.url===section.source)?.title}</a>}</section>)}
    <section className="mt-12"><h2 className="font-display text-3xl">{labels.questions}</h2>{g.questions.map((q,i)=><div key={i} className="mt-5 rounded-xl bg-white p-6"><h3 className="font-semibold">{q.question[locale]}</h3><p className="mt-3 leading-relaxed text-ink/80">{q.answer[locale]}</p></div>)}</section>
    {!!g.sources.length&&<section className="mt-10"><h2 className="font-semibold">{labels.sources}</h2><ul className="mt-4 space-y-3">{g.sources.map(s=><li key={s.url}><a className="underline" href={s.url.startsWith('/fr/')?s.url.replace('/fr/',`/${locale}/`):s.url}>{s.title}</a></li>)}</ul></section>}
    <div className="mt-12 flex flex-wrap gap-4"><Link className="btn-gold" href={`/${locale}/recherche`}>{labels.search}</Link><Link className="btn-ghost" href={`/${locale}/contact`}>{labels.visit}</Link></div>
  </div></article>;
}
