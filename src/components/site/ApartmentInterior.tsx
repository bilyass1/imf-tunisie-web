import type { Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import PlanViewer from './PlanViewer';

const copy = {
  fr: {
    title: 'Votre intérieur en 3D',
    style: 'Luxe contemporain',
    body: 'Pierre claire, bois foncé et touches dorées. Illustration d’aménagement à partir du plan de vente ; consultez le plan original pour les cotes et les caractéristiques contractuelles.',
  },
  en: {
    title: 'Your interior in 3D',
    style: 'Contemporary luxury',
    body: 'Light stone, dark wood and gold accents. Interior design illustration based on the sales plan; refer to the original plan for dimensions and contractual specifications.',
  },
  ar: {
    title: 'تصور داخلي ثلاثي الأبعاد',
    style: 'فخامة معاصرة',
    body: 'حجر فاتح وخشب داكن ولمسات ذهبية. تصور للتأثيث مستند إلى مخطط البيع؛ يرجى الرجوع إلى المخطط الأصلي للأبعاد والمواصفات التعاقدية.',
  },
};

export default function ApartmentInterior({ locale, image, reference, pdf }: { locale: Locale; image: string; reference: string; pdf?: string }) {
  const labels = copy[locale];
  return (
    <section id="interieur" className="scroll-mt-28 bg-ivory py-20">
      <div className="container-lux">
        <p className="eyebrow">{labels.style}</p>
        <h2 className="h-display mt-4 text-3xl sm:text-4xl">{labels.title} · {reference}</h2>
        <p className="mb-8 mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">{labels.body}</p>
        <div className="mx-auto max-w-5xl">
          <PlanViewer image={image} pdf={pdf} alt={`${labels.title} ${reference}`} labels={getDictionary(locale).plan} exists />
        </div>
      </div>
    </section>
  );
}
