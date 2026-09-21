import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale } from '@/i18n/config';
import { getProjects } from '@/lib/db';
import { propertyListings } from '@/lib/property-search';
import { propertyCopy } from '@/lib/property-copy';
import { alternates } from '@/lib/seo';
import PropertyExplorer from '@/components/site/PropertyExplorer';

export async function generateMetadata({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}):Promise<Metadata> {
  const {locale}=await params;
  const l=isLocale(locale)?locale:'fr';
  return { title:propertyCopy[l].title,description:propertyCopy[l].intro,alternates:alternates(l,'/recherche'),robots:Object.keys(await searchParams).length?{index:false,follow:true}:undefined };
}
export default async function SearchPage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;if(!isLocale(locale))notFound();
  const listings=propertyListings(await getProjects(),locale);
  return <section className="bg-ivory pb-20 pt-32"><div className="container-lux"><h1 className="h-display mb-8 text-4xl sm:text-5xl">{propertyCopy[locale].title}</h1><Suspense fallback={<div className="h-96 animate-pulse bg-sand"/>}><PropertyExplorer listings={listings} locale={locale}/></Suspense></div></section>;
}
