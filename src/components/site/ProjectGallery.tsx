'use client';

import { useState, type ComponentProps } from 'react';
import Gallery from './Gallery';
import type { Locale } from '@/i18n/config';

const copy = {
  fr: { all: 'Toutes les photos', perspectives: 'Perspectives 3D', works: 'Chantier et réalisations', interiors: 'Intérieurs', label: 'Catégories de la galerie' },
  en: { all: 'All photos', perspectives: '3D perspectives', works: 'Construction and completed works', interiors: 'Interiors', label: 'Gallery categories' },
  ar: { all: 'كل الصور', perspectives: 'تصورات ثلاثية الأبعاد', works: 'الأشغال والمنجزات', interiors: 'المساحات الداخلية', label: 'أقسام معرض الصور' },
};
type Category = 'all' | 'perspectives' | 'works' | 'interiors';

export default function ProjectGallery({ items, labels, locale, projectSlug }: ComponentProps<typeof Gallery> & { locale: Locale; projectSlug: string }) {
  const [selected, setSelected] = useState<Category>('all');
  const hasCategories = projectSlug === 'diar-al-yassamine' || items.some(item => item.category);
  const category = (item: typeof items[number]): Category => {
    if (item.category) return item.category;
    if (projectSlug !== 'diar-al-yassamine') return 'all';
    const path = item.src.split('?')[0];
    if (/\/int-\d+\./.test(path)) return 'interiors';
    if (/\/reel-\d+\./.test(path)) return 'works';
    if (/\/diar-al-yassamine\/(?:3d-\d+|bloc-a\d+|hero)\./.test(path)) return 'perspectives';
    return 'all';
  };
  const c = copy[locale];
  if (!hasCategories) return <Gallery items={items} labels={labels} />;
  const categories: Category[] = ['all', 'perspectives', 'works', 'interiors'];
  const visible = selected === 'all' ? items : items.filter(item => category(item) === selected);
  return <>
    <div role="group" aria-label={c.label} className="mb-7 flex flex-wrap gap-2">
      {categories.filter(key => key === 'all' || items.some(item => category(item) === key)).map(key =>
        <button key={key} type="button" aria-pressed={selected === key} onClick={() => setSelected(key)}
          className={`rounded-full border px-4 py-3 text-sm transition-colors ${selected === key ? 'border-ink bg-ink text-white' : 'border-ink/20 bg-white text-ink hover:border-gold-500'}`}>
          {c[key]}
        </button>)}
    </div>
    <Gallery key={selected} items={visible} labels={labels} />
  </>;
}
