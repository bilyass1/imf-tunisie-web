import Link from 'next/link';
import type { Locale } from '@/i18n/config';

const copy = {
  fr: { title: 'Plans d’ensemble', ground: 'Rez-de-chaussée', floor: 'Étage', basement: 'Sous-sol' },
  en: { title: 'Building plans', ground: 'Ground floor', floor: 'Floor', basement: 'Basement' },
  ar: { title: 'المخططات العامة', ground: 'الطابق الأرضي', floor: 'الطابق', basement: 'الطابق السفلي' },
};

export default function LaGloireOverviewPlans({ locale }: { locale: Locale }) {
  const labels = copy[locale];
  const documents = [
    { file: 'PLANCHERDC', label: labels.ground },
    ...[1, 2, 3, 4, 5].map(floor => ({ file: `PLANCHE${floor}ETAGE`, label: `${labels.floor} ${floor}` })),
    { file: 'PLANCHESOUS-SOL', label: labels.basement },
  ];

  return (
    <section id="plans-ensemble" aria-labelledby="plans-ensemble-title" className="scroll-mt-[170px] border-b border-ink/8 bg-white py-12 lg:py-16">
      <div className="container-lux">
        <h2 id="plans-ensemble-title" className="h-display text-3xl sm:text-4xl">{labels.title}</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {documents.map(({ file, label }) => (
            <Link key={file} href={`/${locale}/projets/residence-la-gloire/plans/${file}`} className="rounded-lg border border-ink/10 px-4 py-3 text-sm transition hover:border-gold-500 hover:text-gold-700 focus-visible:outline-gold-500">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
