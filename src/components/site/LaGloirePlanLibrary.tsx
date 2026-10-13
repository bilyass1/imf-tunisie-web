import Link from 'next/link';
import { PLAN_ROTATION } from '@/lib/plan-rotation';
import type { Locale } from '@/i18n/config';
import { LA_GLOIRE_LOTS } from '@/lib/lots-la-gloire';
import { getDictionary } from '@/i18n/getDictionary';
import { publicFileExists } from '@/lib/assets';
import InteriorExplorer from './InteriorExplorer';
import PlanViewer from './PlanViewer';

const copy = {
  fr: { title: 'Tous les plans de La Gloire', description: '102 appartements · Plans de vente', block: 'Bloc', floor: 'Étage', ground: 'Rez-de-chaussée', basement: 'Sous-sol', overview: 'Plans d’ensemble', cover: 'Présentation du bloc', open: 'Ouvrir le plan', example: 'Exemple d’aménagement · Rotation à 360°', exampleNote: 'Faites tourner le visuel, zoomez et déplacez-le. Cet exemple d’aménagement est indépendant des plans de vente des appartements.' },
  en: { title: 'All La Gloire floor plans', description: '102 apartments · Sales plans', block: 'Block', floor: 'Floor', ground: 'Ground floor', basement: 'Basement', overview: 'Building plans', cover: 'Block overview', open: 'Open floor plan', example: 'Interior design example · 360° rotation', exampleNote: 'Rotate, zoom and move the image. This interior design example is separate from the apartments’ sales plans.' },
  ar: { title: 'جميع مخططات لا غلوار', description: '102 شقة · مخططات البيع', block: 'العمارة', floor: 'الطابق', ground: 'الطابق الأرضي', basement: 'الطابق السفلي', overview: 'المخططات العامة', cover: 'تقديم العمارة', open: 'فتح المخطط', example: 'مثال للتأثيث · تدوير 360°', exampleNote: 'دوّر الصورة وكبّرها وحرّكها. مثال التأثيث هذا مستقل عن مخططات بيع الشقق.' },
};

export default function LaGloirePlanLibrary({ locale }: { locale: Locale }) {
  const labels = copy[locale];
  const documents = [
    { file: 'PLANCHERDC', label: labels.ground },
    ...[1, 2, 3, 4, 5].map(n => ({ file: `PLANCHE${n}ETAGE`, label: `${labels.floor} ${n}` })),
    { file: 'PLANCHESOUS-SOL', label: labels.basement },
  ];
  return (
    <section id="plans" className="scroll-mt-28 bg-white py-20">
      <div className="container-lux">
        <div className="mb-12 rounded-3xl border border-ink/10 bg-ivory p-5 sm:p-8">
          <h2 className="h-display text-3xl">{labels.example}</h2>
          <p className="mb-6 mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">{labels.exampleNote}</p>
          <div className="mx-auto max-w-4xl">
            <PlanViewer image="/interiors/la-gloire/amenagement-reference-20261013.webp" alt={labels.example} labels={getDictionary(locale).plan} rotation={PLAN_ROTATION[locale]} exists />
          </div>
        </div>
        <InteriorExplorer locale={locale} references={LA_GLOIRE_LOTS.map(([ref]) => ref).filter(ref => publicFileExists(`/interiors/la-gloire/${ref}.webp`))} labels={getDictionary(locale).plan} />
        <h2 className="h-display text-3xl sm:text-4xl">{labels.title}</h2>
        <p className="mt-4 text-sm text-ink/60">{labels.description}</p>
        <div className="mt-9 grid gap-5 md:grid-cols-2">
          {['A', 'B', 'C', 'D'].map(block => (
            <div key={block} className="rounded-2xl border border-ink/10 bg-ivory p-6">
              <h3 className="font-display text-2xl">{labels.block} {block}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {LA_GLOIRE_LOTS.filter(([ref]) => ref.startsWith(block)).map(([ref, type]) => (
                  <Link key={ref} href={`/${locale}/projets/residence-la-gloire/appartements/${ref}#plan`} aria-label={`${labels.open} ${ref} · ${type}`} className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm transition hover:border-gold-500 hover:text-gold-700 focus-visible:outline-gold-500">{ref}</Link>
                ))}
              </div>
              <Link href={`/${locale}/projets/residence-la-gloire/plans/PGARDEBLOC${block}`} className="mt-5 inline-block text-xs underline underline-offset-4">{labels.cover} {block}</Link>
            </div>
          ))}
        </div>
        <h3 className="mt-9 text-lg">{labels.overview}</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          {documents.map(({ file, label }) => <Link key={file} href={`/${locale}/projets/residence-la-gloire/plans/${file}`} className="rounded-lg border border-ink/10 px-4 py-3 text-sm transition hover:border-gold-500">{label}</Link>)}
        </div>
      </div>
    </section>
  );
}
