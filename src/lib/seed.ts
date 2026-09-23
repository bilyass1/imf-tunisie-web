import bcrypt from 'bcryptjs';
import type { Activity, Contact, CrmTask, Database, Deal, Lot, Localized, Project, Room } from './types';
import { LA_GLOIRE_LOTS, YASSAMINE_A5A_LOTS } from './lots-la-gloire';
import { LA_GLOIRE_FOOTPRINTS, LA_GLOIRE_SITE } from './la-gloire-footprints';
import yassamineAvailable from './yassamine-available.json';
import { YASSAMINE_APPROVED_PRICES } from './yassamine-prices';

const L = (fr: string, en: string, ar: string): Localized => ({ fr, en, ar });

/* ------------------------------------------------------------------ */
/*  LOTS                                                               */
/* ------------------------------------------------------------------ */

/**
 * Compose la liste des pièces d'un appartement à partir de sa typologie.
 * Chaque pièce pointe vers le panoramique 360° attendu :
 *   /public/360/<projet>/<REF>/<piece>.jpg  (équirectangulaire, ratio 2:1)
 * Tant que le fichier n'existe pas, la visionneuse affiche « bientôt disponible ».
 */
function buildRooms(
  projectSlug: string,
  ref: string,
  typology: string,
  opts: { garden?: boolean; terrace?: boolean } = {},
): Room[] {
  const bedrooms = Number(typology.replace(/[^0-9]/g, '')) || 1;
  const base = `/360/${projectSlug}/${ref}`;

  const rooms: Room[] = [
    { id: 'salon', label: L('Séjour', 'Living room', 'غرفة الجلوس'), panorama: `${base}/salon.jpg` },
    { id: 'cuisine', label: L('Cuisine', 'Kitchen', 'المطبخ'), panorama: `${base}/cuisine.jpg` },
  ];

  for (let i = 1; i <= bedrooms; i += 1) {
    rooms.push({
      id: `chambre-${i}`,
      label:
        i === 1 && bedrooms > 1
          ? L('Suite parentale', 'Master bedroom', 'الجناح الرئيسي')
          : L(`Chambre ${i}`, `Bedroom ${i}`, `غرفة نوم ${i}`),
      panorama: `${base}/chambre-${i}.jpg`,
    });
  }

  rooms.push({ id: 'sdb', label: L('Salle de bain', 'Bathroom', 'الحمّام'), panorama: `${base}/sdb.jpg` });
  if (bedrooms >= 2) {
    rooms.push({ id: 'sde', label: L('Salle d’eau', 'Shower room', 'غرفة استحمام'), panorama: `${base}/sde.jpg` });
  }
  if (opts.garden) {
    rooms.push({ id: 'jardin', label: L('Jardin privatif', 'Private garden', 'الحديقة الخاصة'), panorama: `${base}/jardin.jpg` });
  } else if (opts.terrace) {
    rooms.push({ id: 'terrasse', label: L('Terrasse', 'Terrace', 'الشرفة'), panorama: `${base}/terrasse.jpg` });
  } else {
    rooms.push({ id: 'balcon', label: L('Balcon', 'Balcony', 'الشرفة'), panorama: `${base}/balcon.jpg` });
  }

  return rooms;
}

function buildGloireLots(): Lot[] {
  return LA_GLOIRE_LOTS.map(([ref, typology, grossArea, sellableArea, gardenArea, terraceArea]) => {
    const block = ref[0];
    const floor = Number(ref[1]);
    const index = ref[2];
    return {
      ref,
      code: `${block} ${floor}-${index}`,
      block,
      floor,
      typology,
      grossArea,
      sellableArea,
      gardenArea,
      terraceArea,
      status: 'available' as const,
      planUrl: `/plans/la-gloire/${ref}.pdf`,
      planImage: `/plans/la-gloire/${ref}.webp`,
      footprint: LA_GLOIRE_FOOTPRINTS[ref],
      rooms: buildRooms('la-gloire', ref, typology, {
        garden: Boolean(gardenArea),
        terrace: Boolean(terraceArea),
      }),
    };
  });
}

function buildYassamineLots(): Lot[] {
  return [...yassamineAvailable.map(lot => ({ ...lot, price: YASSAMINE_APPROVED_PRICES[lot.ref], status: 'available' as const })), ...YASSAMINE_A5A_LOTS.map(([code, typology, grossArea, sellableArea]) => {
    const [, rest] = code.split('-');
    const [floorStr] = rest.split('.');
    const ref = code.replace(/[.\-]/g, '');
    return {
      ref,
      code,
      block: 'A5.a',
      floor: Number(floorStr),
      typology,
      grossArea,
      sellableArea,
      status: 'available' as const,
      planUrl: `/plans/diar-al-yassamine/${ref}.pdf`,
      planImage: `/plans/diar-al-yassamine/${ref}.webp`,
      rooms: buildRooms('diar-al-yassamine', ref, typology),
    };
  })];
}

const gloireBlocks = ['A', 'B', 'C', 'D'].map((id) => ({
  id,
  label: `Bloc ${id}`,
  floors: [0, 1, 2, 3, 4, 5],
}));

/* ------------------------------------------------------------------ */
/*  PROJETS                                                            */
/* ------------------------------------------------------------------ */

const laGloire: Project = {
  slug: 'residence-la-gloire',
  name: 'Résidence La Gloire',
  subtitle: L(
    'Ensemble résidentiel R+5 de haut standing',
    'R+5 high-end residential complex',
    'مجمع سكني راق من خمسة طوابق',
  ),
  city: 'Tunis',
  address: L(
    'Cité Les Palmeraies — El Aouina, Tunis',
    'Cité Les Palmeraies — El Aouina, Tunis',
    'حي النخيلات — العوينة، تونس',
  ),
  status: 'ongoing',
  year: 2026,
  deliveryLabel: L('Livraison prévue 2027', 'Delivery scheduled 2027', 'التسليم المتوقّع 2027'),
  heroImage: '/media/la-gloire/facade-sunset-1.jpg',
  cover: '/media/la-gloire/facade-jour-1.jpg',
  gallery: [
    { src: '/media/la-gloire/facade-jour-1.jpg', caption: L('Façade principale', 'Main façade', 'الواجهة الرئيسية') },
    { src: '/media/la-gloire/facade-jour-2.jpg', caption: L('Angle sud', 'South corner', 'الزاوية الجنوبية') },
    { src: '/media/la-gloire/facade-jour-3.jpg', caption: L('Entrée résidence', 'Residence entrance', 'مدخل الإقامة') },
    { src: '/media/la-gloire/facade-jour-4.jpg', caption: L('Vue d’ensemble', 'Overall view', 'منظر عام') },
    { src: '/media/la-gloire/facade-sunset-1.jpg', caption: L('Lumière de fin de journée', 'Sunset light', 'ضوء الغروب') },
    { src: '/media/la-gloire/facade-sunset-2.jpg', caption: L('Perspective coucher de soleil', 'Sunset perspective', 'منظور الغروب') },
    { src: '/media/la-gloire/facade-nuit-1.jpg', caption: L('Éclairage nocturne', 'Night lighting', 'الإنارة الليلية') },
    { src: '/media/la-gloire/facade-nuit-2.jpg', caption: L('Ambiance nuit', 'Night ambience', 'أجواء ليلية') },
    { src: '/media/la-gloire/hero.jpg', caption: L('Vue nocturne d’ensemble', 'Overall night view', 'منظر ليلي عام') },
    { src: '/media/la-gloire/patio-jour-1.jpg', caption: L('Patio paysager', 'Landscaped patio', 'الفناء المهيأ') },
    { src: '/media/la-gloire/patio-jour-2.jpg', caption: L('Espaces verts', 'Green areas', 'المساحات الخضراء') },
    { src: '/media/la-gloire/patio-nuit-1.jpg', caption: L('Patio de nuit', 'Patio at night', 'الفناء ليلاً') },
    { src: '/media/la-gloire/accueil-1.jpg', caption: L('Hall d’accueil', 'Reception hall', 'بهو الاستقبال') },
    { src: '/media/la-gloire/accueil-2.jpg', caption: L('Réception', 'Reception', 'الاستقبال') },
    { src: '/media/la-gloire/accueil-3.jpg', caption: L('Circulation commune', 'Common circulation', 'الممرات المشتركة') },
    { src: '/media/la-gloire/int-salon.jpg', caption: L('Séjour', 'Living room', 'غرفة الجلوس') },
    { src: '/media/la-gloire/int-chambre.jpg', caption: L('Chambre', 'Bedroom', 'غرفة نوم') },
    { src: '/media/la-gloire/int-suite.jpg', caption: L('Suite parentale', 'Master suite', 'الجناح الرئيسي') },
    { src: '/media/la-gloire/int-cuisine.jpg', caption: L('Cuisine équipée', 'Fitted kitchen', 'مطبخ مجهّز') },
    { src: '/media/la-gloire/int-sdb.jpg', caption: L('Salle de bain', 'Bathroom', 'حمّام') },
    { src: '/media/la-gloire/int-sde.jpg', caption: L('Salle d’eau', 'Shower room', 'غرفة استحمام') },
    { src: '/media/la-gloire/int-c11.jpg', caption: L('Appartement C 1-1', 'Apartment C 1-1', 'شقة C 1-1') },
  ],
  description: L(
    "Résidence La Gloire est un ensemble résidentiel R+5 de haut standing implanté au cœur de la Cité Les Palmeraies, à El Aouina. Quatre blocs — A, B, C et D — s'organisent autour d'un patio paysager qui apporte lumière, calme et intimité à chaque appartement. Du S+1 compact au S+3 avec large terrasse, 102 logements couvrent l'ensemble des besoins, avec jardins privatifs au rez-de-chaussée et terrasses découvertes au dernier niveau.",
    'Résidence La Gloire is an R+5 high-end residential complex in the heart of Cité Les Palmeraies, El Aouina. Four blocks — A, B, C and D — are laid out around a landscaped patio that brings light, quiet and privacy to every apartment. From compact one-bedroom to three-bedroom units with wide terraces, 102 homes cover every need, with private gardens on the ground floor and open terraces on the top level.',
    'إقامة لا غلوار مجمع سكني راق من خمسة طوابق في قلب حي النخيلات بالعوينة. أربع عمارات — A وB وC وD — منظّمة حول فناء مهيأ يمنح كل شقة الضوء والهدوء والخصوصية. من S+1 إلى S+3 بشرفات واسعة، 102 مسكن تلبي كل الحاجات، مع حدائق خاصة بالطابق الأرضي وشرفات مكشوفة بالطابق الأخير.',
  ),
  highlights: [
    L('4 blocs, R+5, 102 appartements', '4 blocks, R+5, 102 apartments', '4 عمارات، 5 طوابق، 102 شقة'),
    L('Typologies S+1, S+2 et S+3', 'One-, two- and three-bedroom units', 'أنماط S+1 وS+2 وS+3'),
    L('Jardins privatifs au RDC', 'Private gardens on the ground floor', 'حدائق خاصة بالطابق الأرضي'),
    L('Terrasses découvertes au 5ᵉ étage', 'Open terraces on the 5th floor', 'شرفات مكشوفة بالطابق الخامس'),
    L('Patio paysager central', 'Central landscaped patio', 'فناء مركزي مهيأ'),
    L('Parking en sous-sol', 'Underground parking', 'موقف سيارات تحت الأرض'),
  ],
  specs: [
    { label: L('Typologie', 'Unit types', 'الأنماط'), value: L('S+1 · S+2 · S+3', 'S+1 · S+2 · S+3', 'S+1 · S+2 · S+3') },
    { label: L('Surfaces vendables', 'Sellable areas', 'المساحات القابلة للبيع'), value: L('46,92 → 180,91 m²', '46.92 → 180.91 m²', '46٫92 → 180٫91 م²') },
    { label: L('Nombre de blocs', 'Blocks', 'عدد العمارات'), value: L('4 (A, B, C, D)', '4 (A, B, C, D)', '4 (A, B, C, D)') },
    { label: L('Niveaux', 'Levels', 'الطوابق'), value: L('RDC + 5 étages', 'Ground + 5 floors', 'طابق أرضي + 5 طوابق') },
    { label: L('Architecte', 'Architect', 'المهندس المعماري'), value: L('Cabinet Slim Feki — Architecture & Déco', 'Cabinet Slim Feki — Architecture & Déco', 'مكتب سليم الفقي — هندسة وديكور') },
    { label: L('Statut', 'Status', 'الحالة'), value: L('En commercialisation', 'Now selling', 'قيد التسويق') },
  ],
  amenities: ['patio', 'parking', 'lift', 'security', 'garden', 'terrace', 'kitchen', 'aluminium'],
  blocks: gloireBlocks,
  lots: buildGloireLots(),
  progress: [
    { label: L('Gros œuvre', 'Structural works', 'الأشغال الكبرى'), percent: 100, done: true },
    { label: L('Façades', 'Façades', 'الواجهات'), percent: 70, done: false },
    { label: L('Second œuvre', 'Finishing works', 'أشغال التشطيب'), percent: 40, done: false },
    { label: L('Aménagements extérieurs', 'Outdoor landscaping', 'التهيئة الخارجية'), percent: 15, done: false },
  ],
  mapQuery: '36.863450,10.264675',
  massing: {
    floorHeight: LA_GLOIRE_SITE.floorHeight,
    bounds: LA_GLOIRE_SITE.bounds,
    patio: LA_GLOIRE_SITE.patio,
    courtyard: LA_GLOIRE_SITE.courtyard,
  },
};

const yassamine: Project = {
  slug: 'diar-al-yassamine',
  name: 'Diar Al Yassamine',
  subtitle: L(
    'Lotissement résidentiel — 7 blocs',
    'Residential development — 7 blocks',
    'تجزئة سكنية — 7 عمارات',
  ),
  city: 'Sfax',
  address: L('Route de l’Habana Km 4, Sfax', 'Route de l’Habana Km 4, Sfax', 'طريق هابانا كلم 4، صفاقس'),
  status: 'ongoing',
  year: 2025,
  deliveryLabel: L('Livraisons échelonnées', 'Phased deliveries', 'تسليم على مراحل'),
  heroImage: '/media/diar-al-yassamine/hero.jpg?v=photo-20260916',
  cover: '/media/diar-al-yassamine/3d-2.jpg?v=photo-20260916',
  gallery: [
    { src: '/media/diar-al-yassamine/hero.jpg?v=photo-20260916', caption: L('Vue d’ensemble · Perspective 3D', 'Development overview · 3D visualization', 'منظر عام · تصور ثلاثي الأبعاد') },
    { src: '/media/diar-al-yassamine/3d-2.jpg?v=photo-20260916', caption: L('Jardins et stationnement · Perspective 3D', 'Gardens and parking · 3D visualization', 'الحدائق ومواقف السيارات · تصور ثلاثي الأبعاد') },
    { src: '/media/diar-al-yassamine/3d-3.jpg?v=photo-20260916', caption: L('Voie interne · Perspective 3D', 'Internal street · 3D visualization', 'الطريق الداخلية · تصور ثلاثي الأبعاد') },
    { src: '/media/diar-al-yassamine/3d-4.jpg?v=photo-20260916', caption: L('Espaces communs · Perspective 3D', 'Common areas · 3D visualization', 'المساحات المشتركة · تصور ثلاثي الأبعاد') },
    { src: '/media/diar-al-yassamine/3d-5.jpg?v=photo-20260916', caption: L('Vue aérienne d’ensemble · Perspective 3D', 'Aerial overview · 3D visualization', 'منظر جوي عام · تصور ثلاثي الأبعاد') },
    { src: '/media/diar-al-yassamine/3d-6.jpg?v=photo-20260916', caption: L('Les blocs vus du ciel · Perspective 3D', 'Blocks from above · 3D visualization', 'العمارات من الأعلى · تصور ثلاثي الأبعاد') },
    { src: '/media/diar-al-yassamine/3d-7.jpg?v=photo-20260916', caption: L('Implantation du lotissement · Perspective 3D', 'Development layout · 3D visualization', 'توزيع العمارات · تصور ثلاثي الأبعاد') },
    { src: '/media/diar-al-yassamine/3d-8.jpg?v=photo-20260916', caption: L('Vue depuis les jardins · Perspective 3D', 'View from the gardens · 3D visualization', 'منظر من الحدائق · تصور ثلاثي الأبعاد') },
    { src: '/media/diar-al-yassamine/bloc-a123.jpg?v=photo-20260916', caption: L('Blocs A1 · A2 · A3 · Perspective 3D', 'Blocks A1 · A2 · A3 · 3D visualization', 'العمارات A1 · A2 · A3 · تصور ثلاثي الأبعاد') },
    { src: '/media/diar-al-yassamine/bloc-a5.jpg?v=photo-20260916', caption: L('Bloc A5 · Perspective 3D', 'Block A5 · 3D visualization', 'العمارة A5 · تصور ثلاثي الأبعاد') },
    { src: '/media/diar-al-yassamine/bloc-a6.jpg?v=photo-20260916', caption: L('Bloc A6 · Perspective 3D', 'Block A6 · 3D visualization', 'العمارة A6 · تصور ثلاثي الأبعاد') },
    { src: '/media/diar-al-yassamine/bloc-a7.jpg?v=photo-20260916', caption: L('Bloc A7 · Perspective 3D', 'Block A7 · 3D visualization', 'العمارة A7 · تصور ثلاثي الأبعاد') },
    { src: '/media/diar-al-yassamine/reel-1.jpg', caption: L('Chantier livré — blocs A1-A3', 'Delivered — blocks A1-A3', 'مُسلَّم — العمارات A1-A3') },
    { src: '/media/diar-al-yassamine/reel-2.jpg', caption: L('Façades réalisées', 'Completed façades', 'الواجهات المنجزة') },
    { src: '/media/diar-al-yassamine/reel-3.jpg', caption: L('Blocs A5 · A6', 'Blocks A5 · A6', 'العمارات A5 · A6') },
    { src: '/media/diar-al-yassamine/reel-4.jpg', caption: L('Avancement chantier', 'Works in progress', 'تقدّم الأشغال') },
    { src: '/media/diar-al-yassamine/int-1.jpg', caption: L('Intérieur livré', 'Delivered interior', 'الداخل المُسلَّم') },
    { src: '/media/diar-al-yassamine/int-2.jpg', caption: L('Finitions', 'Finishes', 'التشطيبات') },
    { src: '/media/diar-al-yassamine/int-3.jpg', caption: L('Menuiserie et sols', 'Joinery and flooring', 'النجارة والأرضيات') },
  ],
  description: L(
    "Diar Al Yassamine est un lotissement résidentiel développé sur la route de l'Habana, à Sfax. Sept blocs (A1 à A7) y sont édifiés par tranches successives, avec une architecture sobre, des espaces communs généreux et un rapport qualité-prix qui a fait le succès du programme. Une partie des logements est éligible au financement FOPROLOS, ce qui rend l'accession à la propriété possible pour les revenus intermédiaires.",
    'Diar Al Yassamine is a residential development on Route de l’Habana in Sfax. Seven blocks (A1 to A7) are being built in successive phases, with restrained architecture, generous common areas and the value-for-money that made the programme a success. Part of the units qualify for FOPROLOS financing, opening home ownership to middle incomes.',
    'ديار الياسمين تجزئة سكنية بطريق هابانا بصفاقس. سبع عمارات (من A1 إلى A7) تُنجز على مراحل متتالية، بهندسة أنيقة ومساحات مشتركة واسعة وجودة بسعر مناسب. جزء من المساكن مؤهّل لتمويل FOPROLOS ممّا يفتح باب التملّك أمام الدخل المتوسّط.',
  ),
  highlights: [
    L('7 blocs résidentiels (A1 → A7)', '7 residential blocks (A1 → A7)', '7 عمارات سكنية (A1 → A7)'),
    L('Éligible FOPROLOS', 'FOPROLOS eligible', 'مؤهّل لـ FOPROLOS'),
    L('Typologies S+1, S+2 et S+3', 'One-, two- and three-bedroom units', 'أنماط S+1 وS+2 وS+3'),
    L('Blocs A1 à A3 livrés', 'Blocks A1 to A3 delivered', 'العمارات A1 إلى A3 مُسلَّمة'),
    L('Livraisons par tranches', 'Phased deliveries', 'تسليم على مراحل'),
  ],
  specs: [
    { label: L('Typologie', 'Unit types', 'الأنماط'), value: L('S+1 · S+2 · S+3', 'S+1 · S+2 · S+3', 'S+1 · S+2 · S+3') },
    { label: L('Blocs', 'Blocks', 'العمارات'), value: L('A1 → A7 (dont A5.a, A5.b, A6.a, A6.b)', 'A1 → A7 (incl. A5.a, A5.b, A6.a, A6.b)', 'A1 → A7 (منها A5.a وA5.b وA6.a وA6.b)') },
    { label: L('Financement', 'Financing', 'التمويل'), value: L('FOPROLOS · crédits bancaires', 'FOPROLOS · bank loans', 'FOPROLOS · قروض بنكية') },
    { label: L('Statut', 'Status', 'الحالة'), value: L('Tranches en cours de commercialisation', 'Phases currently selling', 'مراحل قيد التسويق') },
  ],
  amenities: ['parking', 'lift', 'garden', 'security', 'kitchen'],
  foprolos: true,
  blocks: [
    ...['A1', 'A2', 'A3'].map(id => ({ id, label: `Bloc ${id}`, floors: [0] })),
    { id: 'A5.a', label: 'Bloc A5.a', floors: [0, 1, 2, 3, 4] },
  ],
  lots: buildYassamineLots(),
  videoNote: L(
    'Une vidéo de présentation du programme est disponible sur demande auprès du service commercial.',
    'A programme presentation video is available on request from the sales department.',
    'فيديو تقديمي للمشروع متوفّر عند الطلب لدى المصلحة التجارية.',
  ),
  mapQuery: 'QQ8V+2PG Diar al yassamine, Sidi Mansour',
  massing: {
    floorHeight: 3,
    bounds: { minX: -22, minY: -12, maxX: 22, maxY: 12 },
    fallbackBars: [{ id: 'A5.a', x: 0, z: 0 }],
  },
};

const zephyr: Project = {
  slug: 'residence-zephyr',
  name: 'Résidence Zéphyr',
  subtitle: L('Immeuble de standing — Route Teniour', 'Premium building — Route Teniour', 'عمارة راقية — طريق تنيور'),
  city: 'Sfax',
  address: L('Route Teniour Km 1, Sfax', 'Route Teniour Km 1, Sfax', 'طريق تنيور كلم 1، صفاقس'),
  status: 'delivered',
  year: 2021,
  heroImage: '/media/zephyr/hero.jpg',
  cover: '/media/zephyr/ext-1.jpg',
  gallery: [
    { src: '/media/zephyr/hero.jpg', caption: L('Façade principale', 'Main façade', 'الواجهة الرئيسية') },
    { src: '/media/zephyr/ext-1.jpg', caption: L('Vue extérieure', 'Exterior view', 'منظر خارجي') },
    { src: '/media/zephyr/ext-2.jpg', caption: L('Entrée', 'Entrance', 'المدخل') },
    { src: '/media/zephyr/ext-3.jpg', caption: L('Détail de façade', 'Façade detail', 'تفاصيل الواجهة') },
    { src: '/media/zephyr/ext-4.jpg', caption: L('Angle de rue', 'Street corner', 'زاوية الشارع') },
    { src: '/media/zephyr/ext-5.jpg', caption: L('Vue d’ensemble', 'Overall view', 'منظر عام') },
    { src: '/media/zephyr/vue-1.jpg', caption: L('Perspective', 'Perspective', 'منظور') },
    { src: '/media/zephyr/vue-2.jpg', caption: L('Volumes', 'Massing', 'الكتل') },
    { src: '/media/zephyr/balcon.jpg', caption: L('Balcons et garde-corps', 'Balconies and railings', 'الشرفات والدرابزين') },
    { src: '/media/zephyr/aluminium.jpg', caption: L('Menuiserie aluminium', 'Aluminium joinery', 'نجارة الألمنيوم') },
    { src: '/media/zephyr/cuisine-1.jpg', caption: L('Cuisine équipée', 'Fitted kitchen', 'مطبخ مجهّز') },
    { src: '/media/zephyr/cuisine-2.jpg', caption: L('Plan de travail', 'Worktop', 'سطح العمل') },
    { src: '/media/zephyr/cuisine-3.jpg', caption: L('Rangements cuisine', 'Kitchen storage', 'خزائن المطبخ') },
    { src: '/media/zephyr/sdb-1.jpg', caption: L('Salle de bain', 'Bathroom', 'حمّام') },
    { src: '/media/zephyr/sdb-2.jpg', caption: L('Salle d’eau', 'Shower room', 'غرفة استحمام') },
    { src: '/media/zephyr/bois-1.jpg', caption: L('Dressing sur mesure', 'Bespoke dressing room', 'خزانة ملابس حسب الطلب') },
    { src: '/media/zephyr/bois-2.jpg', caption: L('Menuiserie bois', 'Timber joinery', 'نجارة الخشب') },
    { src: '/media/zephyr/sous-sol.jpg', caption: L('Parking sous-sol', 'Underground parking', 'موقف تحت الأرض') },
  ],
  description: L(
    "Résidence Zéphyr est l'un des programmes signature d'IMF à Sfax : un immeuble de standing sur la route Teniour, livré avec un niveau de finition rarement atteint sur le marché local — menuiserie aluminium à rupture de pont thermique, dressings et cuisines sur mesure, robinetterie haut de gamme, chauffage central et parking en sous-sol. C'est aussi le siège actuel de la société.",
    'Résidence Zéphyr is one of IMF’s signature programmes in Sfax: a premium building on Route Teniour delivered with a level of finish rarely matched locally — thermal-break aluminium joinery, bespoke dressing rooms and kitchens, high-end taps, central heating and underground parking. It is also the company’s current head office.',
    'إقامة زفير من المشاريع المميزة لـ IMF بصفاقس: عمارة راقية بطريق تنيور سُلّمت بمستوى تشطيب نادر محليًا — نجارة ألمنيوم بعازل حراري، خزائن ومطابخ حسب الطلب، حنفيات راقية، تدفئة مركزية وموقف تحت الأرض. وهي كذلك المقر الحالي للشركة.',
  ),
  highlights: [
    L('Finitions haut de gamme', 'High-end finishes', 'تشطيبات راقية'),
    L('Menuiserie aluminium et bois sur mesure', 'Bespoke aluminium and timber joinery', 'نجارة ألمنيوم وخشب حسب الطلب'),
    L('Chauffage central', 'Central heating', 'تدفئة مركزية'),
    L('Parking en sous-sol', 'Underground parking', 'موقف تحت الأرض'),
    L('Siège social IMF', 'IMF head office', 'المقر الاجتماعي لـ IMF'),
  ],
  specs: [
    { label: L('Statut', 'Status', 'الحالة'), value: L('Livré · ventes terminées', 'Delivered · sold out', 'مُسلَّم · بيع مكتمل') },
    { label: L('Livraison', 'Delivery', 'التسليم'), value: L('2021', '2021', '2021') },
    { label: L('Localisation', 'Location', 'الموقع'), value: L('Route Teniour Km 1, Sfax', 'Route Teniour Km 1, Sfax', 'طريق تنيور كلم 1، صفاقس') },
  ],
  amenities: ['parking', 'lift', 'heating', 'kitchen', 'aluminium', 'security'],
  blocks: [],
  lots: [],
  mapQuery: 'Route Teniour Km 1, Sfax',
};

const andalous2: Project = {
  slug: 'diar-al-andalous-2',
  name: 'Diar Al Andalous II',
  subtitle: L('Résidence familiale', 'Family residence', 'إقامة عائلية'),
  city: 'Sfax',
  address: L('Sfax', 'Sfax', 'صفاقس'),
  status: 'delivered',
  year: 2018,
  heroImage: '/media/diar-al-andalous-2/hero.jpg',
  cover: '/media/diar-al-andalous-2/3d-2.jpg',
  gallery: [
    { src: '/media/diar-al-andalous-2/hero.jpg', caption: L('Perspective principale', 'Main perspective', 'المنظور الرئيسي') },
    { src: '/media/diar-al-andalous-2/3d-2.jpg', caption: L('Façade sud', 'South façade', 'الواجهة الجنوبية') },
    { src: '/media/diar-al-andalous-2/3d-3.jpg', caption: L('Entrée', 'Entrance', 'المدخل') },
    { src: '/media/diar-al-andalous-2/3d-4.jpg', caption: L('Vue latérale', 'Side view', 'منظر جانبي') },
    { src: '/media/diar-al-andalous-2/3d-5.jpg', caption: L('Balcons', 'Balconies', 'الشرفات') },
    { src: '/media/diar-al-andalous-2/3d-6.jpg', caption: L('Perspective d’angle', 'Corner perspective', 'منظور الزاوية') },
    { src: '/media/diar-al-andalous-2/nuit-1.jpg', caption: L('Ambiance nocturne', 'Night ambience', 'أجواء ليلية') },
    { src: '/media/diar-al-andalous-2/nuit-2.jpg', caption: L('Éclairage de façade', 'Façade lighting', 'إنارة الواجهة') },
    { src: '/media/diar-al-andalous-2/reel-1.jpg', caption: L('Immeuble livré', 'Delivered building', 'العمارة المُسلَّمة') },
    { src: '/media/diar-al-andalous-2/reel-2.jpg', caption: L('Façade réalisée', 'Completed façade', 'الواجهة المنجزة') },
    { src: '/media/diar-al-andalous-2/reel-3.jpg', caption: L('Vue de la rue', 'Street view', 'منظر من الشارع') },
    { src: '/media/diar-al-andalous-2/reel-4.jpg', caption: L('État actuel', 'Current state', 'الحالة الراهنة') },
  ],
  description: L(
    "Deuxième volet du programme Diar Al Andalous, cette résidence prolonge la démarche du premier immeuble avec des appartements familiaux traversants, des balcons généreux et une façade travaillée en jeux de volumes. Le programme est intégralement livré et vendu.",
    'The second phase of the Diar Al Andalous programme extends the approach of the first building with dual-aspect family apartments, generous balconies and a façade shaped by a play of volumes. The programme is fully delivered and sold.',
    'المرحلة الثانية من مشروع ديار الأندلس تواصل نهج العمارة الأولى بشقق عائلية وشرفات واسعة وواجهة متدرّجة الكتل. المشروع مُسلَّم ومباع بالكامل.',
  ),
  highlights: [
    L('Appartements familiaux', 'Family apartments', 'شقق عائلية'),
    L('Balcons généreux', 'Generous balconies', 'شرفات واسعة'),
    L('Programme entièrement livré', 'Fully delivered programme', 'مشروع مُسلَّم بالكامل'),
  ],
  specs: [
    { label: L('Statut', 'Status', 'الحالة'), value: L('Livré · ventes terminées', 'Delivered · sold out', 'مُسلَّم · بيع مكتمل') },
    { label: L('Livraison', 'Delivery', 'التسليم'), value: L('2018', '2018', '2018') },
  ],
  amenities: ['parking', 'lift', 'security'],
  blocks: [],
  lots: [],
  mapQuery: 'Sfax, Tunisie',
};

const andalous1: Project = {
  slug: 'diar-al-andalous-1',
  name: 'Diar Al Andalous I',
  subtitle: L('Première résidence du programme', 'First residence of the programme', 'الإقامة الأولى للمشروع'),
  city: 'Sfax',
  address: L('Sfax', 'Sfax', 'صفاقس'),
  status: 'delivered',
  year: 2016,
  heroImage: '/media/diar-al-andalous-1/hero.jpg',
  cover: '/media/diar-al-andalous-1/facade-1.jpg',
  gallery: [
    { src: '/media/diar-al-andalous-1/hero.jpg', caption: L('Perspective 3D — vue 1', '3D perspective — view 1', 'منظور ثلاثي الأبعاد — 1') },
    { src: '/media/diar-al-andalous-1/3d-2.jpg', caption: L('Perspective 3D — vue 2', '3D perspective — view 2', 'منظور ثلاثي الأبعاد — 2') },
    { src: '/media/diar-al-andalous-1/3d-3.jpg', caption: L('Perspective 3D — vue 3', '3D perspective — view 3', 'منظور ثلاثي الأبعاد — 3') },
    { src: '/media/diar-al-andalous-1/nuit.jpg', caption: L('Effet nuit', 'Night effect', 'تأثير ليلي') },
    { src: '/media/diar-al-andalous-1/facade-1.jpg', caption: L('Façade réalisée', 'Completed façade', 'الواجهة المنجزة') },
    { src: '/media/diar-al-andalous-1/facade-2.jpg', caption: L('Détail de façade', 'Façade detail', 'تفاصيل الواجهة') },
    { src: '/media/diar-al-andalous-1/facade-3.jpg', caption: L('Vue de la rue', 'Street view', 'منظر من الشارع') },
    { src: '/media/diar-al-andalous-1/entree-1.jpg', caption: L('Hall d’entrée', 'Entrance hall', 'بهو المدخل') },
    { src: '/media/diar-al-andalous-1/entree-2.jpg', caption: L('Circulation commune', 'Common circulation', 'الممرات المشتركة') },
    { src: '/media/diar-al-andalous-1/bois-1.jpg', caption: L('Dressing', 'Dressing room', 'خزانة ملابس') },
    { src: '/media/diar-al-andalous-1/bois-2.jpg', caption: L('Placards de cuisine', 'Kitchen cabinets', 'خزائن المطبخ') },
    { src: '/media/diar-al-andalous-1/sous-sol.jpg', caption: L('Parking sous-sol', 'Underground parking', 'موقف تحت الأرض') },
  ],
  description: L(
    "Diar Al Andalous I a posé les bases du savoir-faire IMF : une conception soignée du hall d'entrée aux placards de cuisine, une façade rythmée par les claustras et les garde-corps, et un sous-sol entièrement dédié au stationnement. Le programme est livré et vendu.",
    'Diar Al Andalous I laid the foundations of IMF’s craft: careful design from the entrance hall to the kitchen cabinets, a façade paced by screens and railings, and a basement fully dedicated to parking. The programme is delivered and sold.',
    'ديار الأندلس I أرست أسس خبرة IMF: تصميم متقن من بهو المدخل إلى خزائن المطبخ، وواجهة منظّمة بالمشربيات والدرابزين، وقبو مخصّص بالكامل لوقوف السيارات. المشروع مُسلَّم ومباع.',
  ),
  highlights: [
    L('Menuiserie bois sur mesure', 'Bespoke timber joinery', 'نجارة خشب حسب الطلب'),
    L('Claustras et garde-corps travaillés', 'Crafted screens and railings', 'مشربيات ودرابزين متقنة'),
    L('Sous-sol de stationnement', 'Basement parking', 'قبو لوقوف السيارات'),
  ],
  specs: [
    { label: L('Statut', 'Status', 'الحالة'), value: L('Livré · ventes terminées', 'Delivered · sold out', 'مُسلَّم · بيع مكتمل') },
    { label: L('Livraison', 'Delivery', 'التسليم'), value: L('2016', '2016', '2016') },
  ],
  amenities: ['parking', 'lift', 'security', 'kitchen'],
  blocks: [],
  lots: [],
  mapQuery: 'Sfax, Tunisie',
};

const marassim: Project = {
  slug: 'complexe-marassim',
  name: 'Complexe Marassim',
  subtitle: L('Salle des fêtes et restaurant', 'Reception hall and restaurant', 'قاعة أفراح ومطعم'),
  city: 'Sfax',
  address: L('Sfax', 'Sfax', 'صفاقس'),
  status: 'delivered',
  year: 2017,
  heroImage: '/media/marassim/hero.jpg',
  cover: '/media/marassim/ext-2.jpg',
  gallery: [
    { src: '/media/marassim/hero.jpg', caption: L('Vue principale', 'Main view', 'المنظر الرئيسي') },
    { src: '/media/marassim/ext-2.jpg', caption: L('Entrée du complexe', 'Complex entrance', 'مدخل المركّب') },
    { src: '/media/marassim/ext-3.jpg', caption: L('Façade', 'Façade', 'الواجهة') },
    { src: '/media/marassim/ext-4.jpg', caption: L('Parvis', 'Forecourt', 'الساحة الأمامية') },
    { src: '/media/marassim/ext-5.jpg', caption: L('Perspective d’ensemble', 'Overall perspective', 'منظور عام') },
    { src: '/media/marassim/ext-nuit.jpg', caption: L('Ambiance nocturne', 'Night ambience', 'أجواء ليلية') },
    { src: '/media/marassim/ext-6.jpg', caption: L('Étude volumétrique', 'Massing study', 'دراسة الكتل') },
    { src: '/media/marassim/ext-7.jpg', caption: L('Variante de façade', 'Façade variant', 'صيغة أخرى للواجهة') },
    { src: '/media/marassim/hall-1.jpg', caption: L('Hall de réception', 'Reception hall', 'بهو الاستقبال') },
    { src: '/media/marassim/hall-2.jpg', caption: L('Escalier d’honneur', 'Grand staircase', 'الدرج الرئيسي') },
    { src: '/media/marassim/salle-1.jpg', caption: L('Salle des fêtes', 'Reception room', 'قاعة الأفراح') },
    { src: '/media/marassim/salle-2.jpg', caption: L('Scène et éclairage', 'Stage and lighting', 'المنصة والإنارة') },
    { src: '/media/marassim/salle-3.jpg', caption: L('Configuration banquet', 'Banquet layout', 'ترتيب المآدب') },
    { src: '/media/marassim/resto-1.jpg', caption: L('Restaurant', 'Restaurant', 'المطعم') },
    { src: '/media/marassim/resto-2.jpg', caption: L('Espace lounge', 'Lounge area', 'فضاء الاستراحة') },
    { src: '/media/marassim/reel-1.jpg', caption: L('Complexe en exploitation', 'Complex in operation', 'المركّب قيد الاستغلال') },
  ],
  description: L(
    "Sortant du logement, IMF a conçu et réalisé le Complexe Marassim : une salle des fêtes, un restaurant et des espaces de réception pensés pour les grands événements sfaxiens. Volumes généreux, hall d'honneur, éclairage scénographique et parvis d'accueil composent un équipement complet, aujourd'hui en exploitation.",
    'Moving beyond housing, IMF designed and built Complexe Marassim: a reception hall, a restaurant and event spaces conceived for large Sfax celebrations. Generous volumes, a grand hall, scenographic lighting and a welcoming forecourt make up a complete venue, now in operation.',
    'خارج مجال السكن، صمّمت IMF وأنجزت مركّب مراسم: قاعة أفراح ومطعم وفضاءات استقبال مهيّأة للمناسبات الكبرى بصفاقس. كتل واسعة وبهو فخم وإنارة مسرحية وساحة استقبال تُكوّن مرفقًا متكاملًا قيد الاستغلال اليوم.',
  ),
  highlights: [
    L('Salle des fêtes grande capacité', 'Large-capacity reception hall', 'قاعة أفراح بسعة كبيرة'),
    L('Restaurant et espaces lounge', 'Restaurant and lounge areas', 'مطعم وفضاءات استراحة'),
    L('Hall d’honneur et parvis', 'Grand hall and forecourt', 'بهو فخم وساحة أمامية'),
  ],
  specs: [
    { label: L('Nature', 'Type', 'الطبيعة'), value: L('Équipement événementiel', 'Event venue', 'مرفق للمناسبات') },
    { label: L('Statut', 'Status', 'الحالة'), value: L('Livré · en exploitation', 'Delivered · in operation', 'مُسلَّم · قيد الاستغلال') },
    { label: L('Livraison', 'Delivery', 'التسليم'), value: L('2017', '2017', '2017') },
  ],
  amenities: ['parking', 'security', 'lift'],
  blocks: [],
  lots: [],
  mapQuery: 'Complexe Marassim, Sfax',
};

export const PROJECTS: Project[] = [laGloire, yassamine, zephyr, andalous2, andalous1, marassim];

/* ------------------------------------------------------------------ */
/*  ACTUALITÉS                                                         */
/* ------------------------------------------------------------------ */

const NEWS = [
  {
    slug: 'lancement-commercialisation-la-gloire',
    date: '2026-02-13',
    title: L(
      'Ouverture de la commercialisation — Résidence La Gloire',
      'Sales open — Résidence La Gloire',
      'انطلاق تسويق إقامة لا غلوار',
    ),
    excerpt: L(
      'Les 102 appartements des blocs A, B, C et D sont désormais disponibles à la réservation.',
      'The 102 apartments across blocks A, B, C and D are now open for reservation.',
      '102 شقة بالعمارات A وB وC وD متاحة الآن للحجز.',
    ),
    body: L(
      "Le dossier commercial de la Résidence La Gloire est officiellement ouvert. Les quatre blocs proposent des typologies S+1 à S+3, de 46,92 m² à 180,91 m² de surface vendable, avec jardins privatifs au rez-de-chaussée et terrasses découvertes au cinquième étage. Le plan de disponibilité en ligne est mis à jour en temps réel : chaque appartement réservé change de statut immédiatement sur le site.",
      'The commercial file for Résidence La Gloire is officially open. The four blocks offer one- to three-bedroom units, from 46.92 m² to 180.91 m² sellable area, with private gardens on the ground floor and open terraces on the fifth floor. The online availability plan is updated in real time: every reserved apartment changes status immediately on the site.',
      'فُتح رسميًا ملف تسويق إقامة لا غلوار. تقترح العمارات الأربع أنماطًا من S+1 إلى S+3، من 46٫92 م² إلى 180٫91 م² مساحة قابلة للبيع، مع حدائق خاصة بالطابق الأرضي وشرفات مكشوفة بالطابق الخامس. مخطط التوفّر على الإنترنت يُحدَّث آنيًا.',
    ),
    image: '/media/la-gloire/facade-sunset-1.jpg',
  },
  {
    slug: 'foprolos-diar-al-yassamine',
    date: '2025-12-18',
    title: L(
      'Diar Al Yassamine : logements éligibles FOPROLOS',
      'Diar Al Yassamine: FOPROLOS-eligible homes',
      'ديار الياسمين: مساكن مؤهّلة لـ FOPROLOS',
    ),
    excerpt: L(
      'Une partie des logements du programme est éligible au financement FOPROLOS.',
      'Part of the programme’s homes qualify for FOPROLOS financing.',
      'جزء من مساكن المشروع مؤهّل لتمويل FOPROLOS.',
    ),
    body: L(
      "Le programme Diar Al Yassamine figure sur la liste des projets approuvés au financement FOPROLOS. Notre service commercial accompagne chaque acquéreur dans le montage du dossier bancaire, de la simulation du crédit à la signature de l'acte.",
      'The Diar Al Yassamine programme is on the list of projects approved for FOPROLOS financing. Our sales team supports every buyer through the bank file, from loan simulation to deed signature.',
      'مشروع ديار الياسمين مُدرج ضمن قائمة المشاريع المصادق عليها لتمويل FOPROLOS. مصلحتنا التجارية ترافق كل مقتنٍ في إعداد الملف البنكي، من محاكاة القرض إلى إمضاء العقد.',
    ),
    image: '/media/diar-al-yassamine/3d-2.jpg?v=photo-20260916',
  },
  {
    slug: 'espace-client-en-ligne',
    date: '2026-09-01',
    title: L(
      'Votre espace client IMF est en ligne',
      'Your IMF client area is live',
      'فضاء الحريف الخاص بكم متاح الآن',
    ),
    excerpt: L(
      'Suivez votre dossier, votre échéancier et l’avancement du chantier depuis votre compte.',
      'Track your file, your payment schedule and site progress from your account.',
      'تابعوا ملفكم ورزنامة الدفع وتقدّم الأشغال من حسابكم.',
    ),
    body: L(
      "Chaque acquéreur IMF dispose désormais d'un espace personnel sécurisé : détail de votre appartement, échéancier de paiement avec suivi des règlements, documents contractuels téléchargeables, avancement du chantier en photos et messagerie directe avec le service commercial.",
      'Every IMF buyer now has a secure personal area: your apartment details, a payment schedule with settlement tracking, downloadable contract documents, site progress in photos and direct messaging with the sales team.',
      'لكل مقتنٍ لدى IMF فضاء شخصي آمن: تفاصيل شقتكم، رزنامة الدفع مع متابعة الخلاص، الوثائق التعاقدية للتحميل، تقدّم الأشغال بالصور ومراسلة مباشرة مع المصلحة التجارية.',
    ),
    image: '/media/la-gloire/accueil-1.jpg',
  },
];

/* ------------------------------------------------------------------ */
/*  SEED                                                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  CRM — jeu de démonstration                                         */
/*  Personnages fictifs, uniquement pour montrer le pipeline.          */
/*  Le bouton « Vider les données de démonstration » du CRM les efface. */
/* ------------------------------------------------------------------ */

const CRM_CONTACTS: Contact[] = [
  { id: 'c-1', createdAt: '2026-08-04', name: 'Anis Trabelsi', phone: '+216 20 111 222', email: 'anis.trabelsi@example.tn', city: 'Tunis', source: 'website', budget: '250 000 – 400 000 TND', tags: ['S+2', 'La Gloire'], demo: true },
  { id: 'c-2', createdAt: '2026-08-09', name: 'Sonia Ben Amor', phone: '+216 22 333 444', email: 'sonia.benamor@example.tn', city: 'Ariana', source: 'facebook', budget: '150 000 – 250 000 TND', tags: ['S+1'], demo: true },
  { id: 'c-3', createdAt: '2026-08-14', name: 'Mohamed Karray', phone: '+216 98 555 666', email: 'm.karray@example.tn', city: 'Sfax', source: 'referral', budget: '> 400 000 TND', tags: ['S+3', 'TRE'], demo: true },
  { id: 'c-4', createdAt: '2026-08-19', name: 'Leïla Gharbi', phone: '+216 55 777 888', city: 'Tunis', source: 'phone', budget: '250 000 – 400 000 TND', tags: ['La Gloire'], demo: true },
  { id: 'c-5', createdAt: '2026-08-24', name: 'Hatem Mabrouk', phone: '+216 24 999 000', email: 'hatem.mabrouk@example.tn', city: 'Sfax', source: 'walk-in', budget: '150 000 – 250 000 TND', tags: ['FOPROLOS', 'Yassamine'], demo: true },
  { id: 'c-6', createdAt: '2026-08-28', name: 'Rania Chaabane', phone: '+216 27 121 314', email: 'rania.ch@example.tn', city: 'Tunis', source: 'salon', budget: '> 400 000 TND', tags: ['S+3', 'Terrasse'], demo: true },
  { id: 'c-7', createdAt: '2026-09-01', name: 'Slim Bouzid', phone: '+216 52 151 617', email: 'slim.bouzid@example.tn', city: 'La Marsa', source: 'website', budget: '250 000 – 400 000 TND', tags: ['La Gloire'], demo: true },
  { id: 'c-8', createdAt: '2026-09-02', name: 'Nadia Jlassi', phone: '+216 29 181 920', city: 'Sfax', source: 'referral', budget: '150 000 – 250 000 TND', tags: ['Yassamine'], demo: true },
];

const CRM_DEALS: Deal[] = [
  { id: 'd-1', createdAt: '2026-08-04', updatedAt: '2026-08-30', contactId: 'c-1', title: 'A 2-2 — S+2', projectSlug: 'residence-la-gloire', lotRef: 'A22', stage: 'offer', value: 340000, probability: 60, expectedCloseDate: '2026-10-15', demo: true },
  { id: 'd-2', createdAt: '2026-08-09', updatedAt: '2026-08-22', contactId: 'c-2', title: 'D 3-1 — S+1', projectSlug: 'residence-la-gloire', lotRef: 'D31', stage: 'visit', value: 165000, probability: 40, expectedCloseDate: '2026-11-01', demo: true },
  { id: 'd-3', createdAt: '2026-08-14', updatedAt: '2026-09-01', contactId: 'c-3', title: 'B 0-2 — S+3 avec jardin', projectSlug: 'residence-la-gloire', lotRef: 'B02', stage: 'reserved', value: 620000, probability: 90, expectedCloseDate: '2026-09-30', demo: true },
  { id: 'd-4', createdAt: '2026-08-19', updatedAt: '2026-08-19', contactId: 'c-4', title: 'C 1-2 — S+2', projectSlug: 'residence-la-gloire', lotRef: 'C12', stage: 'contacted', value: 300000, probability: 25, expectedCloseDate: '2026-12-01', demo: true },
  { id: 'd-5', createdAt: '2026-08-24', updatedAt: '2026-08-27', contactId: 'c-5', title: 'A5-1.1 — S+2 FOPROLOS', projectSlug: 'diar-al-yassamine', lotRef: 'A511', stage: 'visit', value: 180000, probability: 45, expectedCloseDate: '2026-10-30', demo: true },
  { id: 'd-6', createdAt: '2026-08-28', updatedAt: '2026-08-29', contactId: 'c-6', title: 'A 5-3 — S+3 terrasse', projectSlug: 'residence-la-gloire', lotRef: 'A53', stage: 'offer', value: 495000, probability: 55, expectedCloseDate: '2026-10-20', demo: true },
  { id: 'd-7', createdAt: '2026-09-01', updatedAt: '2026-09-01', contactId: 'c-7', title: 'Demande d’information — La Gloire', projectSlug: 'residence-la-gloire', stage: 'new', value: 320000, probability: 10, demo: true },
  { id: 'd-8', createdAt: '2026-09-02', updatedAt: '2026-09-02', contactId: 'c-8', title: 'A5-0.3 — S+1', projectSlug: 'diar-al-yassamine', lotRef: 'A503', stage: 'new', value: 155000, probability: 10, demo: true },
];

const CRM_ACTIVITIES: Activity[] = [
  { id: 'a-1', date: '2026-08-05', type: 'call', contactId: 'c-1', dealId: 'd-1', body: 'Premier appel. Cherche un S+2 côté patio, budget confirmé. Rendez-vous fixé au showroom.', demo: true },
  { id: 'a-2', date: '2026-08-18', type: 'visit', contactId: 'c-1', dealId: 'd-1', body: 'Visite du showroom et du chantier. Très intéressé par le A 2-2. Demande une proposition chiffrée.', demo: true },
  { id: 'a-3', date: '2026-08-30', type: 'email', contactId: 'c-1', dealId: 'd-1', body: 'Offre envoyée : 340 000 TND, échéancier en 5 tranches. Relance prévue sous une semaine.', demo: true },
  { id: 'a-4', date: '2026-08-22', type: 'visit', contactId: 'c-2', dealId: 'd-2', body: 'Visite du D 3-1. Hésite avec le D 2-1, même typologie à l’étage inférieur.', demo: true },
  { id: 'a-5', date: '2026-09-01', type: 'meeting', contactId: 'c-3', dealId: 'd-3', body: 'Signature du contrat de réservation. Acompte encaissé, dossier bancaire en cours.', demo: true },
  { id: 'a-6', date: '2026-08-27', type: 'whatsapp', contactId: 'c-5', dealId: 'd-5', body: 'Envoi de la liste des pièces pour le dossier FOPROLOS.', demo: true },
  { id: 'a-7', date: '2026-08-29', type: 'call', contactId: 'c-6', dealId: 'd-6', body: 'Négocie la terrasse du 5ᵉ. Attend la proposition définitive.', demo: true },
];

const CRM_TASKS: CrmTask[] = [
  { id: 't-1', createdAt: '2026-08-30', title: 'Relancer Anis Trabelsi sur l’offre A 2-2', dueDate: '2026-09-05', done: false, contactId: 'c-1', dealId: 'd-1', demo: true },
  { id: 't-2', createdAt: '2026-09-01', title: 'Envoyer l’échéancier à Rania Chaabane', dueDate: '2026-09-04', done: false, contactId: 'c-6', dealId: 'd-6', demo: true },
  { id: 't-3', createdAt: '2026-09-01', title: 'Rappeler Slim Bouzid (nouvelle demande web)', dueDate: '2026-09-03', done: false, contactId: 'c-7', dealId: 'd-7', demo: true },
  { id: 't-4', createdAt: '2026-08-24', title: 'Vérifier l’éligibilité FOPROLOS de Hatem Mabrouk', dueDate: '2026-09-08', done: false, contactId: 'c-5', dealId: 'd-5', demo: true },
  { id: 't-5', createdAt: '2026-08-20', title: 'Transmettre le contrat signé de M. Karray au notaire', dueDate: '2026-09-02', done: true, contactId: 'c-3', dealId: 'd-3', demo: true },
];

export function buildSeed(): Database {
  const hash = (pwd: string) => bcrypt.hashSync(pwd, 10);

  return {
    projects: PROJECTS,
    news: NEWS,
    contacts: CRM_CONTACTS,
    deals: CRM_DEALS,
    activities: CRM_ACTIVITIES,
    tasks: CRM_TASKS,
    users: [
      {
        id: 'u-admin',
        email: 'admin@imf-tunisie.com.tn',
        passwordHash: hash('imf2026'),
        name: 'Administration IMF',
        role: 'admin',
      },
      {
        id: 'u-demo',
        email: 'client@demo.tn',
        passwordHash: hash('demo2026'),
        name: 'Client démonstration',
        phone: '+216 20 000 000',
        role: 'client',
        projectSlug: 'residence-la-gloire',
        lotRef: 'B13',
        payments: [
          { id: 'p1', label: L('Acompte de réservation', 'Reservation deposit', 'تسبقة الحجز'), dueDate: '2026-03-05', amount: 25000, paid: true, paidAt: '2026-03-04' },
          { id: 'p2', label: L('1ʳᵉ tranche — signature', '1st instalment — signature', 'القسط الأول — الإمضاء'), dueDate: '2026-05-15', amount: 60000, paid: true, paidAt: '2026-05-12' },
          { id: 'p3', label: L('2ᵉ tranche — gros œuvre', '2nd instalment — structure', 'القسط الثاني — الأشغال الكبرى'), dueDate: '2026-10-15', amount: 60000, paid: false },
          { id: 'p4', label: L('3ᵉ tranche — façades', '3rd instalment — façades', 'القسط الثالث — الواجهات'), dueDate: '2027-02-15', amount: 55000, paid: false },
          { id: 'p5', label: L('Solde à la livraison', 'Balance on delivery', 'الرصيد عند التسليم'), dueDate: '2027-09-30', amount: 45000, paid: false },
        ],
        documents: [
          { id: 'd1', label: L('Contrat de réservation', 'Reservation contract', 'عقد الحجز'), kind: 'contract', date: '2026-03-04', href: '#' },
          { id: 'd2', label: L('Plan de l’appartement B 1-3', 'Apartment B 1-3 plan', 'مخطط الشقة B 1-3'), kind: 'plan', date: '2026-03-04', href: '#' },
          { id: 'd3', label: L('Reçu acompte', 'Deposit receipt', 'وصل التسبقة'), kind: 'receipt', date: '2026-03-05', href: '#' },
          { id: 'd4', label: L('Reçu 1ʳᵉ tranche', '1st instalment receipt', 'وصل القسط الأول'), kind: 'receipt', date: '2026-05-12', href: '#' },
        ],
        messages: [
          { id: 'm1', from: 'imf', date: '2026-05-13', body: 'Bonjour, nous confirmons la réception de votre 1ʳᵉ tranche. Le reçu est disponible dans vos documents.' },
          { id: 'm2', from: 'client', date: '2026-08-20', body: 'Merci. Où en est l’avancement des façades du bloc B ?' },
          { id: 'm3', from: 'imf', date: '2026-08-21', body: 'Les façades du bloc B sont à 70 %. Les photos d’avancement sont mises à jour dans votre espace chaque mois.' },
        ],
      },
    ],
  };
}
