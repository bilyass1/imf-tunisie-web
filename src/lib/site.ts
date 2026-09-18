/**
 * Coordonnées et informations légales IMF.
 * Source : papier en-tête et documents commerciaux fournis par IMF.
 * ⚠️ À faire valider par le client avant mise en ligne (voir CONTENU-A-VALIDER.md).
 */
export const SITE = {
  name: 'IMF',
  legalName: 'Immobilière Mseddi Frères',
  arabicName: 'عقارية مسعدي اخوان',
  url: 'https://imf-immobiliere.tn',
  email: 'info@imf-tunisie.com.tn',

  /** Siège commercial actuel (documents commerciaux 2026) */
  office: {
    line1: 'Route Teniour Km 1 — Immeuble Zéphyr, Appt. 3.2',
    line2: '3027 Sfax — Tunisie',
    phones: ['+216 26 711 008', '+216 54 880 083'],
  },

  /** Adresse figurant sur le papier en-tête */
  registeredOffice: {
    line1: 'Route de Gabès, Km 5.5',
    line2: '3083 Sfax — Tunisie',
    phone: '+216 74 454 592',
    fax: '+216 74 454 365',
  },

  technicalPhone: '+216 98 420 088',

  legal: {
    vat: '1213581Z/P/M/000',
    rc: 'B25161862011',
  },

  social: {
    facebook: 'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/',
    linkedin: 'https://www.linkedin.com/',
  },

  agency: {
    name: 'SoluMove Technologies',
    url: 'https://solumove.net',
  },

  figures: {
    years: 15,
    projects: 6,
    units: 300,
    cities: 2,
  },
} as const;

export const NAV_LINKS = [
  { key: 'home', href: '' },
  { key: 'group', href: '/groupe' },
  { key: 'projects', href: '/projets' },
  { key: 'news', href: '/actualites' },
  { key: 'contact', href: '/contact' },
] as const;
