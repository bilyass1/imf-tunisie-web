import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/i18n/config';

const copy = {
  fr: { eyebrow: 'Groupe Mseddi', title: 'Des identités, une même famille.', intro: 'Découvrez les sociétés, les activités et les signatures immobilières du Groupe Mseddi.' },
  en: { eyebrow: 'Mseddi Group', title: 'Distinct identities. One family.', intro: 'Explore the companies, activities and residential brands of Mseddi Group.' },
  ar: { eyebrow: 'مجموعة المسدي', title: 'هويات متنوعة، وعائلة واحدة.', intro: 'اكتشف شركات مجموعة المسدي وأنشطتها وعلاماتها السكنية.' },
};

export default function GroupIdentities({ locale }: { locale: Locale }) {
  const c = copy[locale];
  const identities = [
    { id: 'imf', name: 'IMF', background: '#ffffff', href: `/${locale}/projets` },
    { id: 'marassim', name: 'Marassim', background: '#ffffff', href: `/${locale}/projets/complexe-marassim` },
    { id: 'univers-pharma', name: 'Univers Pharma', background: '#ffffff' },
    { id: 'sma', name: 'SMA', background: '#031126' },
    { id: 'sms', name: 'SMS', background: '#f8f6f1' },
    { id: 'la-gloire', name: 'Résidence La Gloire', background: '#123f36', href: `/${locale}/projets/residence-la-gloire` },
  ];
  return (
    <section id="identites" aria-labelledby="group-identities-title" className="scroll-mt-28 bg-ivory py-20 lg:py-28">
      <div className="container-lux">
        <div className="max-w-2xl">
          <p className="eyebrow">{c.eyebrow}</p>
          <h2 id="group-identities-title" className="h-display mt-4 text-4xl leading-tight sm:text-5xl">{c.title}</h2>
          <p className="mt-5 text-base leading-relaxed text-ink/65">{c.intro}</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {identities.map(identity => {
            const contents = <>
              <div className="relative aspect-[3/2] overflow-hidden border-b border-ink/5" style={{ backgroundColor: identity.background }}>
                <Image src={`/brands/${identity.id}.webp`} alt="" fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" className={`object-contain ${identity.id === 'la-gloire' ? 'scale-150' : identity.id === 'sma' || identity.id === 'sms' ? '' : 'p-6'}`} />
              </div>
              <div className="p-6"><h3 className="font-display text-2xl" dir="auto">{identity.name}</h3></div>
            </>;
            return <article key={identity.id} className="min-w-0 overflow-hidden rounded-2xl border border-ink/10 bg-white">
              {identity.href ? <Link href={identity.href} className="block h-full transition hover:text-gold-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500">{contents}</Link> : contents}
            </article>;
          })}
        </div>
      </div>
    </section>
  );
}
