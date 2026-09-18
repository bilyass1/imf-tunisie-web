import { SITE } from './site';
import { locales, type Locale } from '@/i18n/config';

export function alternates(locale: Locale, path = '') {
  return { canonical: `${SITE.url}/${locale}${path}`, languages: {
    ...Object.fromEntries(locales.map(l => [l, `${SITE.url}/${l}${path}`])),
    'x-default': `${SITE.url}/fr${path}`,
  } };
}
export function jsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, '\\u003c'); }
export const organization = {
  '@context': 'https://schema.org', '@type': 'RealEstateAgent', '@id': `${SITE.url}/#organization`,
  name: SITE.legalName, alternateName: [SITE.name, SITE.arabicName], url: SITE.url,
  logo: `${SITE.url}/icon.png`, telephone: SITE.office.phones[0], email: SITE.email,
  address: { '@type': 'PostalAddress', streetAddress: SITE.office.line1, addressLocality: 'Sfax', postalCode: '3027', addressCountry: 'TN' },
  areaServed: ['Tunisie', 'Sfax', 'Tunis'],
  contactPoint: { '@type': 'ContactPoint', telephone: SITE.office.phones[0], contactType: 'sales', availableLanguage: ['French', 'Arabic', 'English'] },
};
