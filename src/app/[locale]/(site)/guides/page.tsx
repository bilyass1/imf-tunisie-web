import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale } from '@/i18n/config';
import { propertyGuides } from '@/lib/property-guides';
import { alternates } from '@/lib/seo';
const titles={fr:'Guides immobiliers en Tunisie',en:'Property guides for Tunisia',ar:'أدلة عقارية في تونس'};
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
  const {locale}=await params;const l=isLocale(locale)?locale:'fr';
  return {title:titles[l],description:{fr:'Plans, surfaces, visites et achat depuis l’étranger : des repères pratiques pour préparer votre projet immobilier en Tunisie.',en:'Plans, floor areas, visits and buying from abroad: practical guidance for your property project in Tunisia.',ar:'مخططات ومساحات وزيارات وشراء من الخارج: إرشادات عملية للتحضير لمشروعك العقاري في تونس.'}[l],alternates:alternates(l,'/guides')};
}
export default async function GuidesPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(!isLocale(locale))notFound();
  return <section className="bg-ivory pb-20 pt-32"><div className="container-lux"><h1 className="h-display mb-10 text-4xl sm:text-5xl">{titles[locale]}</h1>
    <div className="grid gap-6 lg:grid-cols-3">{propertyGuides.map(guide=><article key={guide.slug} className="rounded-2xl border border-ink/10 bg-white p-7">
      <p className="text-sm text-gold-700"><time dateTime={guide.updated}>{guide.updated}</time> · IMF</p><h2 className="my-5 font-display text-3xl"><Link href={`/${locale}/guides/${guide.slug}`}>{guide.title[locale]}</Link></h2><p className="leading-relaxed text-ink/70">{guide.summary[locale]}</p>
      <Link className="mt-6 inline-block font-semibold underline underline-offset-4" href={`/${locale}/guides/${guide.slug}`}>{locale==='ar'?'قراءة الدليل':locale==='en'?'Read guide':'Lire le guide'} →</Link>
    </article>)}</div>
  </div></section>;
}
