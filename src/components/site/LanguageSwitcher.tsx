'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { locales, localeMeta, type Locale } from '@/i18n/config';
import { IconGlobe, IconChevronDown } from '@/components/Icons';

export default function LanguageSwitcher({ locale, light = false }: { locale: Locale; light?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function switchTo(next: Locale) {
    document.cookie = `imf_locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    const rest = pathname.replace(/^\/(fr|en|ar)/, '');
    setOpen(false);
    router.push(`/${next}${rest}`);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
          light
            ? 'border-white/25 text-white/85 hover:border-gold-300 hover:text-gold-200'
            : 'border-ink/15 text-ink/70 hover:border-gold-400 hover:text-gold-600'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <IconGlobe className="h-3.5 w-3.5" />
        {localeMeta[locale].short}
        <IconChevronDown className={`h-3 w-3 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute end-0 top-[calc(100%+8px)] z-50 min-w-[150px] overflow-hidden rounded-xl border border-ink/10 bg-white py-1 shadow-lux"
        >
          {locales.map((l) => (
            <li key={l}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  switchTo(l);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-start text-sm transition hover:bg-sand ${
                  l === locale ? 'font-semibold text-gold-600' : 'text-ink/75'
                }`}
              >
                {localeMeta[l].label}
                <span className="text-[10px] uppercase tracking-widest text-ink/35">{localeMeta[l].short}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
