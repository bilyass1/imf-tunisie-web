import type { Localized, Project } from './types';
import galleryPhotoRefresh from './gallery-photo-refresh.json';

const L = (fr: string, en: string, ar: string): Localized => ({ fr, en, ar });

const photoRefresh: Record<string, { directory: string; oldCover: string; reference: string }> = {
  'complexe-marassim': { directory: 'marassim', oldCover: 'ext-2.jpg', reference: 'hero.jpg' },
  'residence-zephyr': { directory: 'zephyr', oldCover: 'ext-1.jpg', reference: 'ext-3.jpg' },
  'diar-al-andalous-1': { directory: 'diar-al-andalous-1', oldCover: 'facade-1.jpg', reference: 'hero.jpg' },
  'diar-al-andalous-2': { directory: 'diar-al-andalous-2', oldCover: '3d-2.jpg', reference: 'hero.jpg' },
};

const zephyrCaptions: Record<string, Localized> = {
  'hero.jpg': L('Jardin intérieur', 'Interior garden', 'الحديقة الداخلية'),
  'ext-1.jpg': L('Patio et garde-corps', 'Courtyard and railings', 'الفناء والدرابزين'),
  'ext-2.jpg': L('Façade sur patio', 'Courtyard façade', 'الواجهة المطلة على الفناء'),
  'ext-4.jpg': L('Façade au crépuscule', 'Façade at dusk', 'الواجهة عند الغسق'),
  'ext-5.jpg': L('Façade de nuit', 'Façade at night', 'الواجهة ليلاً'),
  'vue-1.jpg': L('Détail du plan de travail', 'Worktop detail', 'تفاصيل سطح العمل'),
  'vue-2.jpg': L('Palier et ascenseurs', 'Landing and lifts', 'ردهة الطابق والمصاعد'),
  'balcon.jpg': L('Enduit et garde-corps vitré', 'Render and glass railing', 'الكسوة والدرابزين الزجاجي'),
  'cuisine-2.jpg': L('Rangements de cuisine', 'Kitchen cabinets', 'خزائن المطبخ'),
  'cuisine-3.jpg': L('Cuisine et plan de travail', 'Kitchen and worktop', 'المطبخ وسطح العمل'),
  'bois-1.jpg': L('Porte et interphone', 'Door and intercom', 'الباب وجهاز الاتصال الداخلي'),
  'bois-2.jpg': L('Placards sur mesure', 'Fitted wardrobes', 'خزائن حسب الطلب'),
};

function refreshProjectPhotos(project: Project): Project {
  const config = photoRefresh[project.slug];
  if (!config) return project;
  const base = `/media/${config.directory}/`;
  const image = `${base}facade-photo-20260922.webp`;
  if (project.galleryEdited) return {
    ...project,
    heroImage: project.heroImage.split('?')[0] === `${base}hero.jpg` ? image : project.heroImage,
    cover: project.cover.split('?')[0] === `${base}${config.oldCover}` ? image : project.cover,
  };
  const caption = L('Façade · Visualisation photoréaliste', 'Façade · Photorealistic visualization', 'الواجهة · تصور واقعي');
  const gallery = project.gallery.map(item => {
    const source = item.src.split('?')[0];
    if (source === `${base}${config.reference}`) return { ...item, src: image, caption };
    const corrected = source === '/media/marassim/hall-2.jpg'
      ? L('Hall et réception', 'Lobby and reception', 'البهو والاستقبال')
      : config.directory === 'zephyr' && source.startsWith(base) ? zephyrCaptions[source.slice(base.length)] : undefined;
    const replacement = (galleryPhotoRefresh as Record<string, { src: string; kind: string }>)[source];
    if (replacement && source.startsWith(base)) {
      const originalCaption = corrected || item.caption;
      const suffix = replacement.kind === 'visualization'
        ? L('Visualisation photoréaliste', 'Photorealistic visualization', 'تصور واقعي')
        : L('Photo retouchée', 'Retouched photo', 'صورة محسّنة');
      return { ...item, src: replacement.src, caption: L(
        `${originalCaption.fr} · ${suffix.fr}`,
        `${originalCaption.en} · ${suffix.en}`,
        `${originalCaption.ar} · ${suffix.ar}`,
      ) };
    }
    return corrected ? { ...item, caption: corrected } : item;
  });
  // Only replace the known gallery assets; administrator uploads remain intact.
  // Apply to JSON/PostgreSQL records without rewriting stored data.
  const refreshed = gallery.find(item => item.src === image);
  return {
    ...project,
    heroImage: project.heroImage.split('?')[0] === `${base}hero.jpg` ? image : project.heroImage,
    cover: project.cover.split('?')[0] === `${base}${config.oldCover}` ? image : project.cover,
    gallery: refreshed ? [refreshed, ...gallery.filter(item => item.src !== image)] : gallery,
  };
}

/** Programme-wide figures supplied in the owner's notes on 22 September 2026.
 * These are not counts of the partial online inventory, nor individual lot statuses.
 */
export const YASSAMINE_PROGRAMME = {
  apartments: 177, shops: 2, sold: 63, inProgress: 114,
  minArea: 56.40, maxArea: 104.97,
  blocks: ['A1', 'A2', 'A3', 'A4', 'A5.a', 'A5.b', 'A6.a', 'A6.b', 'A7'],
} as const;

function presentationPlan(path: string | undefined, slug: string): string | undefined {
  if (!path) return path;
  const directory = slug === 'residence-la-gloire' ? 'la-gloire'
    : slug === 'diar-al-yassamine' ? 'diar-al-yassamine' : null;
  if (!directory) return path;
  const prefix = `/plans/${directory}/`;
  // Uploaded documents and original DWGs keep their own URLs.
  if (!path.startsWith(prefix) || path.slice(prefix.length).includes('/')) return path;
  if (!/\.(pdf|webp)(?:\?.*)?$/i.test(path)) return path;
  return `${prefix}presentation/${path.slice(prefix.length)}`;
}

// Apply confirmed presentation corrections to existing databases as well as seeds.
// Commercial prices, availability, plans and client records are never rewritten.
export function projectPresentation(project: Project): Project {
  project = refreshProjectPhotos(project);
  if (project.slug === 'residence-la-gloire' || project.slug === 'diar-al-yassamine') {
    project = { ...project, lots: project.lots.map(lot => ({
      ...lot,
      planImage: presentationPlan(lot.planImage, project.slug),
      planUrl: presentationPlan(lot.planUrl, project.slug),
    })) };
  }
  if (project.slug === 'diar-al-yassamine') {
    project = { ...project, gallery: project.gallery.map(item => {
      if (item.src.split('?')[0] !== '/media/diar-al-yassamine/3d-4.jpg') return item;
      const old = {
        fr: 'Espaces communs · Perspective 3D',
        en: 'Common areas · 3D visualization',
        ar: 'المساحات المشتركة · تصور ثلاثي الأبعاد',
      };
      const corrected = {
        fr: 'Bloc 4 · Perspective 3D',
        en: 'Block 4 · 3D visualization',
        ar: 'العمارة 4 · تصور ثلاثي الأبعاد',
      };
      return { ...item, caption: {
        fr: item.caption.fr === old.fr ? corrected.fr : item.caption.fr,
        en: item.caption.en === old.en ? corrected.en : item.caption.en,
        ar: item.caption.ar === old.ar ? corrected.ar : item.caption.ar,
      } };
    }) };
  }
  if (project.presentationEdited) return project;
  if (project.slug === 'residence-la-gloire') return {
    ...project,
    deliveryLabel: L('Livraison prévue 2028', 'Delivery scheduled 2028', 'التسليم المتوقع 2028'),
  };
  if (project.slug !== 'diar-al-yassamine') return project;
  return {
    ...project,
    subtitle: L('Lotissement résidentiel — 9 blocs', 'Residential development — 9 blocks', 'تجزئة سكنية — 9 عمارات'),
    address: L('Route de l’Habana Km 4, Sfax', 'Route de l’Habana Km 4, Sfax', 'طريق هابانا كلم 4، صفاقس'),
    description: L(
      'Diar Al Yassamine, sur la route de l’Habana à Sfax, comprend 177 appartements et 2 commerces répartis sur 9 blocs : A1, A2, A3, A4, A5.a, A5.b, A6.a, A6.b et A7. Les surfaces des appartements vont de 56,40 m² (S+1) à 104,97 m² (S+3). Au 22 septembre 2026, le bilan fourni indiquait 63 appartements vendus et 114 en cours de construction. Les disponibilités des lots publiés ci-dessous sont mises à jour séparément.',
      'Diar Al Yassamine, on Route de l’Habana in Sfax, comprises 177 apartments and 2 shops across 9 blocks: A1, A2, A3, A4, A5.a, A5.b, A6.a, A6.b and A7. Apartment areas range from 56.40 m² (one bedroom) to 104.97 m² (three bedrooms). The figures provided on 22 September 2026 listed 63 apartments sold and 114 under construction. Availability for the apartments listed below is updated separately.',
      'يضم مشروع ديار الياسمين بطريق هابانا بصفاقس 177 شقة ومحلين تجاريين موزعة على 9 عمارات: A1 وA2 وA3 وA4 وA5.a وA5.b وA6.a وA6.b وA7. تتراوح مساحات الشقق بين 56.40 م² للصنف S+1 و104.97 م² للصنف S+3. أفادت البيانات المقدمة بتاريخ 22 سبتمبر 2026 ببيع 63 شقة ووجود 114 شقة قيد البناء. يتم تحديث توفر الشقق المنشورة أدناه بشكل مستقل.',
    ),
    highlights: [
      L('9 blocs · 177 appartements · 2 commerces', '9 blocks · 177 apartments · 2 shops', '9 عمارات · 177 شقة · محلان تجاريان'),
      ...project.highlights.filter(item => !/7 blocs|9 blocs/.test(item.fr)),
    ],
    specs: project.specs.map(item => item.label.fr === 'Blocs'
      ? { ...item, value: L(YASSAMINE_PROGRAMME.blocks.join(' · '), YASSAMINE_PROGRAMME.blocks.join(' · '), YASSAMINE_PROGRAMME.blocks.join(' · ')) }
      : item),
  };
}
