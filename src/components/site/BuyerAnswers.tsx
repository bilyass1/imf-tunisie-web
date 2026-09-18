import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { jsonLd } from '@/lib/seo';
const content = {
  fr: { title: 'Acheter en Tunisie, depuis la Tunisie ou l’étranger', items: [
    ['Où se situent les projets IMF ?', 'IMF, Immobilière Mseddi Frères, présente ses programmes immobiliers à Sfax et à Tunis. Chaque fiche projet indique son adresse et sa localisation.'],
    ['Comment choisir un appartement ?', 'Consultez les disponibilités, le plan, la surface, le type et le prix lorsqu’il est renseigné. Contactez IMF pour confirmer la disponibilité et les conditions de réservation.'],
    ['Je suis Tunisien résidant à l’étranger : comment préparer mon achat ?', 'Vous pouvez consulter les projets, plans et fiches appartements en ligne, puis contacter IMF par téléphone ou via le formulaire. Précisez votre pays de résidence, le projet et l’appartement souhaités pour discuter des étapes, des documents nécessaires et d’une visite.'],
    ['Diar Al Yassamine propose-t-il le financement FOPROLOS ?', 'Des logements de Diar Al Yassamine font partie du programme FOPROLOS. Les prix approuvés sont indiqués pour les lots documentés. L’éligibilité du logement et du demandeur ainsi que les conditions du prêt doivent être confirmées auprès d’IMF et de BH Bank.'],
  ], contact: 'Contacter IMF', projects: 'Voir les projets' },
  en: { title: 'Buying in Tunisia, locally or from abroad', items: [
    ['Where are IMF projects located?', 'IMF, Immobilière Mseddi Frères, presents residential developments in Sfax and Tunis. Each project page includes its address and location.'],
    ['How can I choose an apartment?', 'Review availability, plans, area, apartment type and documented prices. Contact IMF to confirm availability and reservation conditions.'],
    ['How can Tunisians living abroad prepare their purchase?', 'Browse projects and apartment plans online, then contact IMF by phone or the contact form. Include your country of residence and preferred project and apartment to discuss steps, required documents and a visit.'],
    ['Does Diar Al Yassamine offer FOPROLOS financing?', 'Some Diar Al Yassamine homes are part of FOPROLOS. Approved prices are shown for documented apartments. Confirm property and applicant eligibility and loan conditions with IMF and BH Bank.'],
  ], contact: 'Contact IMF', projects: 'View projects' },
  ar: { title: 'اقتناء مسكن في تونس للمقيمين بتونس وبالخارج', items: [
    ['أين تقع مشاريع IMF؟', 'تقدم عقارية مسعدي إخوان مشاريع سكنية بصفاقس وتونس. تتضمن صفحة كل مشروع العنوان والموقع.'],
    ['كيف أختار شقة؟', 'اطلع على الشقق المتاحة والمخطط والمساحة والنوع والسعر عند توفره. اتصل بالشركة لتأكيد التوفر وشروط الحجز.'],
    ['كيف يستعد التونسي المقيم بالخارج لاقتناء مسكن؟', 'يمكنك الاطلاع على المشاريع ومخططات الشقق عبر الموقع ثم الاتصال بالشركة هاتفياً أو عبر نموذج الاتصال. اذكر بلد إقامتك والمشروع والشقة المطلوبة لمناقشة المراحل والوثائق اللازمة والزيارة.'],
    ['هل يشمل فوبرولوس مشروع ديار الياسمين؟', 'تندرج بعض مساكن ديار الياسمين ضمن فوبرولوس. تُعرض الأسعار المصادق عليها للشقق الموثقة. يجب تأكيد أهلية المسكن والمشتري وشروط القرض لدى الشركة وبنك BH.'],
  ], contact: 'اتصل بالشركة', projects: 'المشاريع' },
};
export default function BuyerAnswers({ locale }: { locale: Locale }) {
  const c = content[locale];
  return <section className="bg-ivory py-20"><div className="container-lux">
    <h2 className="h-display text-3xl sm:text-4xl">{c.title}</h2>
    <div className="mt-8 grid gap-6 md:grid-cols-2">{c.items.map(([q,a]) => <article key={q} className="rounded-2xl border border-ink/10 bg-white p-6"><h3 className="font-serif text-xl">{q}</h3><p className="mt-3 text-sm leading-relaxed text-ink/65">{a}</p></article>)}</div>
    <div className="mt-7 flex flex-wrap gap-4"><Link className="btn-gold" href={`/${locale}/contact`}>{c.contact}</Link><Link className="btn-ghost" href={`/${locale}/projets`}>{c.projects}</Link></div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ '@context':'https://schema.org', '@type':'FAQPage', mainEntity:c.items.map(([q,a])=>({ '@type':'Question', name:q, acceptedAnswer:{ '@type':'Answer', text:a } })) }) }} />
  </div></section>;
}
