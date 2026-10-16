'use client';

import { usePathname, useRouter } from 'next/navigation';
import { locales, localeMeta, type Locale } from '@/i18n/config';
import { IconGlobe } from '@/components/Icons';

const labels = { fr: 'Langue du site', en: 'Site language', ar: 'لغة الموقع' };
export default function LanguageSwitcher({ locale, light = false }: { locale: Locale; light?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  return <label className={`relative flex min-h-11 items-center gap-1 rounded-full border px-2 ${light ? 'border-white/40 bg-black/40 text-white' : 'border-ink/25 bg-ivory text-ink'}`}>
    <IconGlobe className="h-4 w-4" aria-hidden="true" />
    <span className="sr-only">{labels[locale]}</span>
    <select value={locale} lang={locale} className="min-h-11 min-w-0 w-20 max-w-20 cursor-pointer bg-transparent text-sm font-semibold" onChange={event => {
      const next = locales.find(value => value === event.target.value);
      if (!next) return;
      document.cookie = `imf_locale=${next}; path=/; max-age=31536000; SameSite=Lax`;
      router.push(`/${next}${pathname.replace(/^\/(fr|en|ar)(?=\/|$)/, '')}${window.location.search}${window.location.hash}`);
    }}>
      {locales.map(value => <option key={value} value={value} lang={value} className="bg-white text-ink">{localeMeta[value].label}</option>)}
    </select>
  </label>;
}
