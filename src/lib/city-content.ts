import type { Locale } from '@/i18n/config';
import type { Project } from './types';
import { formatArea } from './format';

export type City = 'sfax' | 'tunis';
export const cityName = (city: City, locale: Locale) => locale==='ar' ? (city==='sfax' ? 'صفاقس' : 'تونس') : city==='sfax' ? 'Sfax' : 'Tunis';
export function cityListings(projects: Project[], city: City) {
  const selected = projects.filter(project=>project.city.trim().toLowerCase()===city);
  const available = selected.flatMap(project=>project.lots.filter(lot=>lot.status==='available').map(lot=>({project,lot})));
  const areas = available.map(({lot})=>lot.sellableArea).filter((area):area is number=>typeof area==='number' && Number.isFinite(area) && area>0);
  return {projects:selected,available,minArea:areas.length?Math.min(...areas):undefined,maxArea:areas.length?Math.max(...areas):undefined};
}
export const cityCopy = {
  fr: {projects:'Résidences et adresses',available:'Appartements disponibles',areas:'Surfaces vendables documentées',faq:'Vos questions',contact:'Parler à IMF',visit:'Demander une visite',empty:'Aucun lot disponible publié actuellement. Contactez IMF pour les prochaines disponibilités.',confirm:'Disponibilités et prix à confirmer avec IMF avant réservation. Les rendus sont illustratifs.',details:'Voir la fiche',request:'Prix sur demande',home:'Accueil',intro:'Découvrez les résidences IMF et les appartements affichés disponibles. Consultez les adresses, les plans et les surfaces avant de préparer une visite.',knownAreas:'Fourchette calculée uniquement sur les surfaces publiées des lots disponibles ; certaines surfaces peuvent manquer.'},
  en: {projects:'Residences and addresses',available:'Available apartments',areas:'Documented saleable areas',faq:'Your questions',contact:'Talk to IMF',visit:'Request a visit',empty:'No available units are currently published. Contact IMF for upcoming availability.',confirm:'Confirm availability and prices with IMF before reserving. Renderings are illustrative.',details:'View apartment',request:'Price on request',home:'Home',intro:'Explore IMF residences and units currently listed as available. Check addresses, plans and floor areas, and arrange an on-site or video visit from abroad.',knownAreas:'This range uses only published saleable areas of available units; some areas may be missing.'},
  ar: {projects:'الإقامات والعناوين',available:'الشقق المتاحة',areas:'المساحات القابلة للبيع حسب البيانات المنشورة',faq:'أسئلتك حول الشراء',contact:'تواصل مع IMF',visit:'اطلب زيارة',empty:'لا توجد حاليا شقق منشورة بحالة متاحة. اتصل بالفريق لمعرفة المستجدات.',confirm:'تأكد من التوفر والثمن مع IMF قبل الحجز. الصور ثلاثية الأبعاد توضيحية.',details:'تفاصيل الشقة',request:'السعر عند الطلب',home:'الرئيسية',intro:'تعرّف على إقامات IMF والشقق المعروضة بحالة متاحة. اطّلع على العنوان والمخطط والمساحة، ثم رتّب زيارة على عين المكان أو عبر الفيديو إذا كنت بالخارج.',knownAreas:'هذا النطاق محسوب من المساحات المنشورة للشقق المتاحة فقط؛ قد تكون بعض المساحات غير متوفرة.'},
};
export function cityTitle(city: City, locale: Locale) {
  const name=cityName(city,locale);
  return locale==='ar' ? `شقق للبيع في ${name} | IMF` : locale==='en' ? `Apartments for sale in ${name} | IMF` : `Appartement à vendre à ${name} | IMF`;
}
export function cityDescription(city: City, locale: Locale) {
  const name=cityName(city,locale);
  return locale==='ar' ? `اكتشف شقق IMF في ${name}: الإقامات، المخططات، المساحات والتوفر. تواصل معنا لترتيب زيارة وتأكيد الثمن.`
    : locale==='en' ? `Explore IMF apartments in ${name}: residences, plans, floor areas and availability. Arrange an on-site or video visit with our team.`
    : `Appartements IMF à ${name} : résidences, plans, surfaces et disponibilités. Contactez notre équipe pour confirmer les prix et organiser une visite.`;
}
export function cityFaq(city: City, locale: Locale, data: ReturnType<typeof cityListings>) {
  const name=cityName(city,locale);
  const addresses=data.projects.map(project=>`${project.name} : ${project.address[locale]}`).join(' ; ');
  const range=data.minArea!==undefined ? `${formatArea(data.minArea,locale)} – ${formatArea(data.maxArea,locale)}` : undefined;
  if(locale==='ar') return [
    {question:`أين تقع مشاريع IMF في ${name}؟`,answer:addresses || 'اتصل بفريق IMF لتأكيد المشاريع والعناوين المتاحة.'},
    {question:'ما الشقق المتاحة حاليا؟',answer:`توجد ${data.available.length} شقة منشورة بحالة متاحة في هذه الصفحة. راجع مرجع كل شقة واتصل بالفريق لتأكيد توفرها قبل الحجز.`},
    {question:'ما المساحات والأسعار؟',answer:`${range ? `تتراوح المساحات القابلة للبيع المنشورة للشقق المتاحة بين ${range}.` : 'المساحات غير منشورة حاليا.'} يُعرض الثمن فقط عند توفره في بيانات الشقة؛ اطلب عرضا مكتوبا من IMF.`},
    {question:city==='sfax'?'هل يمكن تمويل الشراء بفوبرولوس؟':'كيف أتابع الشراء وأنا خارج تونس؟',answer:city==='sfax'?'اطلب من IMF تفاصيل الشقة والمشروع، ثم تحقق مع بنك الإسكان من أهلية الشقة ووضعيتك وشروط التمويل. وجود إشارة فوبرولوس لا يعني الموافقة على القرض.':'يمكنك طلب زيارة على عين المكان أو عبر الفيديو من صفحة الاتصال. اذكر المشروع ومرجع الشقة، واطلب الوثائق والخطوات المناسبة لوضعيتك من الفريق.'},
  ];
  if(locale==='en') return [
    {question:`Where are IMF projects in ${name}?`,answer:addresses || 'Contact IMF to confirm current projects and addresses.'},
    {question:'Which apartments are currently available?',answer:`This page lists ${data.available.length} units marked available. Check each unit reference and confirm availability with IMF before reserving.`},
    {question:'What floor areas and prices are published?',answer:`${range ? `Published saleable areas of available units range from ${range}.` : 'No floor areas are currently published.'} Prices appear only when documented for the unit. Ask IMF for a written quotation.`},
    {question:city==='sfax'?'Can I use FOPROLOS financing?':'Can I prepare my purchase from abroad?',answer:city==='sfax'?'Ask IMF for the unit and development details, then check the property, your eligibility and the financing conditions with BH Bank. A FOPROLOS label does not constitute loan approval.':'Request an on-site or video visit through the contact page. Include the project and unit reference, and ask the team which documents and steps apply to your situation.'},
  ];
  return [
    {question:`Où se situent les projets IMF à ${name} ?`,answer:addresses || 'Contactez IMF pour confirmer les projets et adresses disponibles.'},
    {question:'Quels appartements sont disponibles ?',answer:`Cette page recense ${data.available.length} lots affichés disponibles. Consultez leur référence et confirmez leur disponibilité avec IMF avant toute réservation.`},
    {question:'Quelles sont les surfaces et les prix ?',answer:`${range ? `Les surfaces vendables publiées des lots disponibles vont de ${range}.` : 'Aucune surface n’est publiée actuellement.'} Un prix apparaît uniquement lorsqu’il est documenté pour le lot. Demandez une proposition écrite à IMF.`},
    {question:city==='sfax'?'Le financement FOPROLOS est-il possible ?':'Puis-je préparer mon achat depuis l’étranger ?',answer:city==='sfax'?'Demandez à IMF les informations du lot et du programme, puis faites vérifier l’éligibilité du logement, votre situation et les conditions par BH Bank. Une mention FOPROLOS ne constitue pas un accord de crédit.':'Demandez une visite sur place ou en visioconférence depuis la page contact. Précisez le projet et la référence du lot et faites confirmer les documents et démarches adaptés à votre situation.'},
  ];
}
