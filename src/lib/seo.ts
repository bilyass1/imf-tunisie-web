import { SITE } from './site';
import { locales, type Locale } from '@/i18n/config';
import type { Lot, Project } from './types';
import { documentedPrice, lotPath, projectPath } from './agent-content';
import { YASSAMINE_PROGRAMME } from './project-presentation';
import { LA_GLOIRE_LOTS } from './lots-la-gloire';

export function alternates(locale: Locale, path = '') {
  return { canonical: `${SITE.url}/${locale}${path}`, languages: {
    ...Object.fromEntries(locales.map(l => [l, `${SITE.url}/${l}${path}`])),
    'x-default': `${SITE.url}/fr${path}`,
  } };
}
export function jsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, '\\u003c'); }
export function socialProfiles(values: readonly string[]) {
  return values.filter(value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && /^(www\.)?(facebook|instagram|linkedin)\.com$/.test(url.hostname)
        && url.pathname.split('/').filter(Boolean).length > 0
        && !/^\/(home|login|signup|explore|accounts)\/?$/i.test(url.pathname);
    } catch { return false; }
  });
}
const sameAs = socialProfiles(Object.values(SITE.social));
export const organization = {
  '@context': 'https://schema.org', '@type': 'RealEstateAgent', '@id': `${SITE.url}/#organization`,
  name: SITE.legalName, alternateName: [SITE.name, SITE.arabicName], url: SITE.url,
  logo: `${SITE.url}/icon.png`, telephone: SITE.office.phones[0], email: SITE.email,
  address: { '@type': 'PostalAddress', streetAddress: SITE.office.line1, addressLocality: 'Sfax', postalCode: '3027', addressCountry: 'TN' },
  areaServed: ['Tunisie', 'Sfax', 'Tunis'],
  image: `${SITE.url}/media/imf/siege.jpg`, knowsLanguage: ['fr', 'ar', 'en'],
  ...(sameAs.length ? {sameAs} : {}),
  department: [
    { '@type':'RealEstateAgent', '@id':`${SITE.url}/#sfax`, name:`${SITE.legalName} — Sfax`,
      address:{'@type':'PostalAddress',streetAddress:SITE.office.line1,addressLocality:'Sfax',postalCode:'3027',addressCountry:'TN'}, telephone:SITE.office.phones[0] },
    { '@type':'RealEstateAgent', '@id':`${SITE.url}/#tunis`, name:`${SITE.legalName} — Tunis Ennasr`,
      address:{'@type':'PostalAddress',streetAddress:SITE.tunisOffice.line1,addressLocality:'Tunis',addressCountry:'TN'} },
  ],
  contactPoint: { '@type': 'ContactPoint', telephone: SITE.office.phones[0], contactType: 'sales', availableLanguage: ['French', 'Arabic', 'English'] },
};

export function breadcrumbs(items: {name:string;path:string}[]) {
  return {'@type':'BreadcrumbList',itemListElement:items.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,item:`${SITE.url}${item.path}`}))};
}
export function projectBreadcrumbs(project: Project, locale: Locale, lot?: Lot) {
  const labels = {fr:['Accueil','Projets'],en:['Home','Projects'],ar:['الرئيسية','المشاريع']}[locale];
  return breadcrumbs([
    {name:labels[0],path:`/${locale}`}, {name:labels[1],path:`/${locale}/projets`},
    {name:project.name,path:projectPath(project,locale)},
    ...(lot ? [{name:lot.code,path:lotPath(project,lot.ref,locale)}] : []),
  ]);
}
export function apartmentSchema(project: Project, lot: Lot, locale: Locale) {
  const url = `${SITE.url}${lotPath(project,lot.ref,locale)}`;
  const bedrooms = /^S\+(\d+)$/i.exec(lot.typology)?.[1];
  const priceKnown = documentedPrice(lot.price);
  return {
    // Product supplies the schema.org domain of offers for a marketed property.
    '@type':['Apartment','Product'], '@id':`${url}#apartment`, url,
    name:`${lot.code} · ${project.name}`, description:project.description[locale],
    image:new URL(project.cover,SITE.url).href,
    numberOfBedrooms:bedrooms === undefined ? undefined : Number(bedrooms),
    // S+n documents one living room plus n bedrooms; never infer from 360 hotspots.
    numberOfRooms:bedrooms === undefined ? undefined : Number(bedrooms)+1,
    floorLevel:Number.isFinite(lot.floor) ? String(lot.floor) : undefined,
    floorSize:lot.sellableArea && lot.sellableArea>0 ? {'@type':'QuantitativeValue',value:lot.sellableArea,unitCode:'MTK'} : undefined,
    address:{'@type':'PostalAddress',streetAddress:project.address[locale],addressLocality:project.city,addressCountry:'TN'},
    containedInPlace:{'@id':`${SITE.url}${projectPath(project,locale)}#residence`},
    offers:lot.status==='sold' || (lot.status==='available' && priceKnown) ? {
      '@type':'Offer',url, ...(priceKnown ? {price:lot.price,priceCurrency:'TND'} : {}),
      availability:`https://schema.org/${lot.status==='sold' ? 'SoldOut' : 'InStock'}`,
      seller:{'@id':organization['@id']},
    } : undefined,
  };
}
export function projectSchema(project: Project, locale: Locale) {
  const available = project.lots.filter(lot=>lot.status==='available');
  const prices = available.map(lot=>lot.price).filter(documentedPrice);
  // The catalog is sometimes partial: only publish documented programme totals.
  const total = project.slug==='diar-al-yassamine' ? YASSAMINE_PROGRAMME.apartments
    : project.slug==='residence-la-gloire' ? LA_GLOIRE_LOTS.length : undefined;
  return {
    '@context':'https://schema.org','@graph':[
      {
        '@type':prices.length ? ['ApartmentComplex','Product'] : 'ApartmentComplex',
        '@id':`${SITE.url}${projectPath(project,locale)}#residence`,
        name:project.name,description:project.description[locale],url:`${SITE.url}${projectPath(project,locale)}`,
        address:{'@type':'PostalAddress',streetAddress:project.address[locale],addressLocality:project.city,addressCountry:'TN'},
        numberOfAccommodationUnits:total ? {'@type':'QuantitativeValue',value:total} : undefined,
        image:[...new Set([project.heroImage,project.cover,...project.gallery.map(image=>image.src)])].map(image=>new URL(image,SITE.url).href),
        containsPlace:project.lots.map(lot=>({'@id':`${SITE.url}${lotPath(project,lot.ref,locale)}#apartment`})),
        offers:prices.length ? {'@type':'AggregateOffer',priceCurrency:'TND',lowPrice:Math.min(...prices),highPrice:Math.max(...prices),offerCount:available.length} : undefined,
      },
      ...project.lots.map(lot=>apartmentSchema(project,lot,locale)),
      projectBreadcrumbs(project,locale),
    ],
  };
}
