import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale } from '@/i18n/config';
import { getProjects } from '@/lib/db';
import { propertyListings } from '@/lib/property-search';
import { propertyCopy } from '@/lib/property-copy';
import { PropertySelectionPage } from '@/components/site/PropertyExplorer';
export const metadata:Metadata={robots:{index:false,follow:true}};
export default async function SelectionPage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;if(!isLocale(locale))notFound();
  return <section className="bg-ivory pb-20 pt-32"><div className="container-lux"><h1 className="h-display mb-8 text-4xl">{propertyCopy[locale].selection}</h1><PropertySelectionPage listings={propertyListings(await getProjects(),locale)} locale={locale}/></div></section>;
}
