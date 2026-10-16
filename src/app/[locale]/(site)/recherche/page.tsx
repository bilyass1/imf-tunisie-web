import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale } from '@/i18n/config';
import { getProjects } from '@/lib/db';
import { getStore } from '@/lib/postgres-store.cjs';
import { propertyListings, readFilters } from '@/lib/property-search';
import { propertyCopy } from '@/lib/property-copy';
import { alternates } from '@/lib/seo';
import PropertyExplorer from '@/components/site/PropertyExplorer';

export async function generateMetadata({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}):Promise<Metadata> {
  const {locale}=await params;
  const l=isLocale(locale)?locale:'fr';
  return { title:propertyCopy[l].title,description:propertyCopy[l].intro,alternates:alternates(l,'/recherche'),robots:Object.keys(await searchParams).length?{index:false,follow:true}:undefined };
}
export default async function SearchPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {locale}=await params;if(!isLocale(locale))notFound();
  const paramsQuery=new URLSearchParams(Object.entries(await searchParams).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));
  const filters=readFilters(paramsQuery),page=Math.min(400,Math.max(1,Math.floor(Number(paramsQuery.get('page'))||1)));
  const server=process.env.DATABASE_URL?await getStore().searchProperties(filters,locale,page):undefined;
  const listings=server?.items??propertyListings(await getProjects(),locale);
  return <section className="bg-ivory pb-20 pt-32"><div className="container-lux"><h1 className="h-display mb-8 text-4xl sm:text-5xl">{propertyCopy[locale].title}</h1><Suspense fallback={<div className="min-h-screen animate-pulse bg-sand"/>}><PropertyExplorer server={server} listings={listings} locale={locale}/></Suspense></div></section>;
}
