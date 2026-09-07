export const locales = ['fr', 'en', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';

export const localeMeta: Record<Locale, { label: string; short: string; dir: 'ltr' | 'rtl'; htmlLang: string }> = {
  fr: { label: 'Français', short: 'FR', dir: 'ltr', htmlLang: 'fr-TN' },
  en: { label: 'English', short: 'EN', dir: 'ltr', htmlLang: 'en' },
  ar: { label: 'العربية', short: 'ع', dir: 'rtl', htmlLang: 'ar-TN' },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): 'ltr' | 'rtl' {
  return localeMeta[locale].dir;
}
