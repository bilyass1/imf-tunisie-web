import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, locales } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { LA_GLOIRE_DOCUMENTS } from '@/lib/la-gloire-documents';
import { publicFileExists } from '@/lib/assets';
import PlanViewer from '@/components/site/PlanViewer';
import { alternates } from '@/lib/seo';

const copy = {
  fr: { back: 'Tous les plans de La Gloire', title: 'Plan de vente original', hint: 'Consultez le plan ici, agrandissez-le ou passez en plein écran pour lire les détails.' },
  en: { back: 'All La Gloire plans', title: 'Original sales plan', hint: 'View the plan here, zoom in or use full screen to read the details.' },
  ar: { back: 'جميع مخططات لا غلوار', title: 'مخطط البيع الأصلي', hint: 'تصفح المخطط هنا وكبّر الصورة أو استخدم الشاشة الكاملة لقراءة التفاصيل.' },
};

export function generateStaticParams() {
  return locales.flatMap(locale => LA_GLOIRE_DOCUMENTS.map(({file}) => ({ locale, slug:'residence-la-gloire', document:file })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string; document: string }> }): Promise<Metadata> {
  const { locale, slug, document } = await params;
  if (!isLocale(locale) || slug !== 'residence-la-gloire') return {};
  const plan = LA_GLOIRE_DOCUMENTS.find(item => item.file === document);
  if (!plan) return {};
  const path = `/projets/${slug}/plans/${document}`;
  const description = locale === 'ar'
    ? `المخطط الأصلي ${plan.label.ar} لإقامة لا غلوار بتونس.`
    : locale === 'en'
      ? `Original ${plan.label.en.toLowerCase()} sales plan for Résidence La Gloire in Tunis.`
      : `Plan de vente original ${plan.label.fr.toLowerCase()} de la Résidence La Gloire à Tunis.`;
  return { title:`${plan.label[locale]} · Résidence La Gloire`, description, alternates:alternates(locale,path), robots:{index:true,follow:true} };
}

export default async function BuildingPlanPage({ params }: { params: Promise<{ locale: string; slug: string; document: string }> }) {
  const { locale, slug, document } = await params;
  if (!isLocale(locale) || slug !== 'residence-la-gloire') notFound();
  const plan = LA_GLOIRE_DOCUMENTS.find(item => item.file === document);
  if (!plan) notFound();
  const t = copy[locale];
  const base = `/plans/la-gloire/ensemble/${plan.file}`;
  return <section className="bg-ivory pb-16 pt-28 sm:pt-36">
    <div className="container-lux">
      <Link href={`/${locale}/projets/residence-la-gloire#plans`} className="text-sm underline underline-offset-4">{t.back}</Link>
      <p className="eyebrow mt-8">La Gloire · {t.title}</p>
      <h1 className="h-display mt-3 text-3xl sm:text-5xl">{plan.label[locale]}</h1>
      <p className="mb-7 mt-4 text-sm text-ink/60">{t.hint}</p>
      <PlanViewer image={`${base}.webp`} pdf={`${base}.pdf`} alt={`La Gloire · ${plan.label[locale]}`} labels={getDictionary(locale).plan} exists={publicFileExists(`${base}.webp`)} />
      <nav aria-label={t.back} className="mt-8 flex flex-wrap gap-3">
        {LA_GLOIRE_DOCUMENTS.map(item => <Link key={item.file} href={`/${locale}/projets/residence-la-gloire/plans/${item.file}`} aria-current={item.file === document ? 'page' : undefined} className={`rounded-lg border px-4 py-3 text-sm ${item.file === document ? 'border-gold-500 bg-white text-gold-700' : 'border-ink/10 hover:border-gold-500'}`}>{item.label[locale]}</Link>)}
      </nav>
    </div>
  </section>;
}
