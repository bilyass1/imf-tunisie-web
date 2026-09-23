import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/i18n/config';

const copy = {
  fr: { eyebrow: 'Groupe Mseddi', title: 'Des identités, une même famille.', intro: 'Découvrez les sociétés, les activités et les signatures immobilières du Groupe Mseddi.', company: 'Société', venue: 'Événementiel', residence: 'Programme immobilier', discover: 'Découvrir', realEstate: 'Promotion immobilière', imf: 'Immobilière Mseddi Frères', marble: 'Marbre', pharma: 'Univers pharmaceutique', auto: 'Automobile · Mobilité · Service', sma: 'Société Automobile Mseddi', marassim: 'Complexe de cérémonies et de réception', gloire: 'Une signature résidentielle à Tunis' },
  en: { eyebrow: 'Mseddi Group', title: 'Distinct identities. One family.', intro: 'Explore the companies, activities and residential brands of Mseddi Group.', company: 'Company', venue: 'Events', residence: 'Residential development', discover: 'Discover', realEstate: 'Property development', imf: 'Immobilière Mseddi Frères', marble: 'Marble', pharma: 'Pharmaceutical sector', auto: 'Automotive · Mobility · Service', sma: 'Société Automobile Mseddi', marassim: 'Ceremony and reception complex', gloire: 'A residential signature in Tunis' },
  ar: { eyebrow: 'مجموعة المسدي', title: 'هويات متنوعة، وعائلة واحدة.', intro: 'اكتشف شركات مجموعة المسدي وأنشطتها وعلاماتها السكنية.', company: 'شركة', venue: 'مناسبات', residence: 'مشروع سكني', discover: 'اكتشف', realEstate: 'البعث العقاري', imf: 'العقارية المسدي إخوان', marble: 'الرخام', pharma: 'القطاع الصيدلاني', auto: 'السيارات · التنقل · الخدمات', sma: 'شركة المسدي للسيارات', marassim: 'مجمع للحفلات والاستقبال', gloire: 'هوية سكنية في تونس' },
};

export default function GroupIdentities({ locale }: { locale: Locale }) {
  const c = copy[locale];
  const identities = [
    { id: 'imf', name: 'IMF', description: c.imf, activity: c.realEstate, category: c.company, background: '#ffffff', href: `/${locale}/projets` },
    { id: 'marassim', name: 'Marassim', description: c.marassim, activity: c.venue, category: c.venue, background: '#ffffff', href: `/${locale}/projets/complexe-marassim` },
    { id: 'univers-pharma', name: 'Univers Pharma', description: c.pharma, activity: c.pharma, category: c.company, background: '#ffffff' },
    { id: 'sma', name: 'SMA', description: c.sma, activity: c.auto, category: c.company, background: '#031126' },
    { id: 'sms', name: 'SMS', description: c.marble, activity: c.marble, category: c.company, background: '#f8f6f1' },
    { id: 'la-gloire', name: 'Résidence La Gloire', description: c.gloire, activity: c.realEstate, category: c.residence, background: '#123f36', href: `/${locale}/projets/residence-la-gloire` },
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
          {identities.map(identity => (
            <article key={identity.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white">
              <div className="relative aspect-[3/2] overflow-hidden border-b border-ink/5" style={{ backgroundColor: identity.background }}>
                <Image src={`/brands/${identity.id}.webp`} alt={`Logo ${identity.name}`} fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" className={`object-contain ${identity.id === 'la-gloire' ? 'scale-150' : identity.id === 'sma' || identity.id === 'sms' ? '' : 'p-6'}`} />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-700">{identity.category}</p>
                <h3 className="mt-3 font-display text-2xl" dir="auto">{identity.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">{identity.description}</p>
                {identity.activity !== identity.description && identity.activity !== identity.category && <p className="mt-2 text-xs text-ink/55">{identity.activity}</p>}
                {identity.href && <Link href={identity.href} className="mt-6 inline-flex min-h-11 items-center gap-3 self-start text-sm font-semibold text-gold-700 underline-offset-4 hover:underline">{c.discover}<span className="sr-only"> {identity.name}</span><span aria-hidden="true" className="rtl:rotate-180">→</span></Link>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
