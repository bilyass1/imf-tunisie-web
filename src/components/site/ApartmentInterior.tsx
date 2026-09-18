import type { Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import PlanViewer from './PlanViewer';

const copy = {
  fr: {
    title: 'Votre intérieur en 3D',
    style: 'Luxe contemporain',
    body: 'Pierre claire, bois foncé et touches dorées. Illustration d’aménagement à partir du plan de vente ; consultez le plan original pour les cotes et les caractéristiques contractuelles.',
    galleryTitle: 'Ambiances intérieures',
    galleryBody: 'Ambiances représentatives de l’univers La Gloire. Le plan de chaque appartement reste la référence pour l’agencement et les dimensions.',
    kitchen: 'Cuisine',
    primarySuite: 'Suite parentale',
    bedroom: 'Chambre',
  },
  en: {
    title: 'Your interior in 3D',
    style: 'Contemporary luxury',
    body: 'Light stone, dark wood and gold accents. Interior design illustration based on the sales plan; refer to the original plan for dimensions and contractual specifications.',
    galleryTitle: 'Interior atmospheres',
    galleryBody: 'Representative views of the La Gloire interior style. Each apartment plan remains the reference for layout and dimensions.',
    kitchen: 'Kitchen',
    primarySuite: 'Primary suite',
    bedroom: 'Bedroom',
  },
  ar: {
    title: 'تصور داخلي ثلاثي الأبعاد',
    style: 'فخامة معاصرة',
    body: 'حجر فاتح وخشب داكن ولمسات ذهبية. تصور للتأثيث مستند إلى مخطط البيع؛ يرجى الرجوع إلى المخطط الأصلي للأبعاد والمواصفات التعاقدية.',
    galleryTitle: 'أجواء داخلية',
    galleryBody: 'تصورات تمثيلية لهوية لاغلوار الداخلية. يبقى مخطط كل شقة المرجع للتوزيع والأبعاد.',
    kitchen: 'المطبخ',
    primarySuite: 'الجناح الرئيسي',
    bedroom: 'غرفة النوم',
  },
};

export default function ApartmentInterior({ locale, image, reference, pdf }: { locale: Locale; image: string; reference: string; pdf?: string }) {
  const labels = copy[locale];
  const rooms = [
    { src: '/interiors/la-gloire/rooms/cuisine.webp', label: labels.kitchen },
    { src: '/interiors/la-gloire/rooms/suite-parentale.webp', label: labels.primarySuite },
    { src: '/interiors/la-gloire/rooms/chambre.webp', label: labels.bedroom },
  ];

  return (
    <section id="interieur" className="scroll-mt-28 bg-ivory py-20">
      <div className="container-lux">
        <p className="eyebrow">{labels.style}</p>
        <h2 className="h-display mt-4 text-3xl sm:text-4xl">{labels.title} · {reference}</h2>
        <p className="mb-8 mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">{labels.body}</p>
        <div className="mx-auto max-w-5xl">
          <PlanViewer image={image} pdf={pdf} alt={`${labels.title} ${reference}`} labels={getDictionary(locale).plan} exists />
        </div>
        <div className="mt-14">
          <h3 className="font-serif text-2xl text-ink sm:text-3xl">{labels.galleryTitle}</h3>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/60">{labels.galleryBody}</p>
          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {rooms.map((room) => (
              <figure key={room.src} className="group overflow-hidden rounded-sm border border-ink/10 bg-white shadow-[0_18px_55px_rgba(36,27,21,0.08)]">
                <div className="aspect-[16/10] overflow-hidden bg-stone-100">
                  <img
                    src={room.src}
                    alt={`${room.label} · Résidence La Gloire`}
                    width={1672}
                    height={941}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
                    loading="lazy"
                  />
                </div>
                <figcaption className="px-5 py-4 font-serif text-lg text-ink">{room.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
