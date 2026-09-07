import type { Locale } from '@/i18n/config';
import type { Localized } from './types';

const intlLocale: Record<Locale, string> = { fr: 'fr-TN', en: 'en-GB', ar: 'ar-TN' };

export function t(value: Localized | undefined, locale: Locale): string {
  if (!value) return '';
  return value[locale] ?? value.fr;
}

export function formatArea(value: number | undefined, locale: Locale): string {
  if (!value) return '—';
  return `${new Intl.NumberFormat(intlLocale[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} m²`;
}

export function formatMoney(value: number | undefined, locale: Locale): string {
  if (value === undefined || value === null) return '—';
  return `${new Intl.NumberFormat(intlLocale[locale], { maximumFractionDigits: 0 }).format(value)} TND`;
}

export function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(intlLocale[locale], {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function floorLabel(floor: number, locale: Locale): string {
  if (floor === 0) return locale === 'ar' ? 'الطابق الأرضي' : locale === 'en' ? 'Ground floor' : 'Rez-de-chaussée';
  if (locale === 'ar') return `الطابق ${floor}`;
  if (locale === 'en') return `Floor ${floor}`;
  return floor === 1 ? '1ᵉʳ étage' : `${floor}ᵉ étage`;
}
