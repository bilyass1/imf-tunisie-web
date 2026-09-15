import type { Locale } from '@/i18n/config';

export const LA_GLOIRE_DOCUMENTS = [
  ...['A', 'B', 'C', 'D'].map(block => ({
    file: `PGARDEBLOC${block}`,
    label: { fr: `Présentation du bloc ${block}`, en: `Block ${block} overview`, ar: `تقديم العمارة ${block}` },
  })),
  { file: 'PLANCHERDC', label: { fr: 'Rez-de-chaussée', en: 'Ground floor', ar: 'الطابق الأرضي' } },
  ...[1, 2, 3, 4, 5].map(floor => ({
    file: `PLANCHE${floor}ETAGE`,
    label: { fr: `Étage ${floor}`, en: `Floor ${floor}`, ar: `الطابق ${floor}` },
  })),
  { file: 'PLANCHESOUS-SOL', label: { fr: 'Sous-sol', en: 'Basement', ar: 'الطابق السفلي' } },
] satisfies { file: string; label: Record<Locale, string> }[];
