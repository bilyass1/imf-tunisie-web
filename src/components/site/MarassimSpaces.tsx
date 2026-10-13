import type { Locale } from '@/i18n/config';
import { MARASSIM_PRESENTATION as content } from '@/lib/marassim-presentation';
import { t } from '@/lib/format';

export default function MarassimSpaces({ locale }: { locale: Locale }) {
  return <section id="espaces" aria-labelledby="marassim-spaces-title" className="scroll-mt-[170px] bg-white py-20 lg:py-28">
    <div className="container-lux">
      <p className="eyebrow">{t(content.nav, locale)}</p>
      <h2 id="marassim-spaces-title" className="h-display mt-4 text-3xl sm:text-4xl">{t(content.sectionTitle, locale)}</h2>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {content.sections.map((section, index) => <article key={section.title.fr} className="rounded-2xl border border-ink/10 bg-ivory p-6 sm:p-8">
          <span aria-hidden="true" className="font-display text-3xl text-gold-600">{String(index + 1).padStart(2, '0')}</span>
          <h3 className="mt-4 text-base font-semibold leading-relaxed">{t(section.title, locale)}</h3>
          <p className="mt-4 text-sm leading-relaxed text-ink/65">{t(section.body, locale)}</p>
        </article>)}
      </div>
      <div className="mt-10 rounded-2xl bg-ink p-6 text-ivory sm:p-10">
        <h3 className="font-display text-2xl sm:text-3xl">{t(content.summaryTitle, locale)}</h3>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/75">{t(content.summary, locale)}</p>
        <p className="mt-6 text-sm leading-relaxed text-gold-200">{t(content.capacities, locale)}</p>
        <p className="mt-3 text-sm leading-relaxed text-white/75">{t(content.facilities, locale)}</p>
        <p className="mt-8 font-display text-xl">{t(content.closing, locale)}</p>
      </div>
    </div>
  </section>;
}
