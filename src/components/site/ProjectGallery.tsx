'use client';
import { useState, type ComponentProps } from 'react';
import Gallery from './Gallery';
import type { Locale } from '@/i18n/config';
import { DEFAULT_GALLERY_FILTERS, galleryPhotoCategory, type GalleryFilter } from '@/lib/gallery-filters';

const copy={fr:{all:'Toutes les photos',label:'Catégories de la galerie',empty:'Aucune photo dans cette rubrique pour le moment.'},en:{all:'All photos',label:'Gallery categories',empty:'No photos in this category yet.'},ar:{all:'كل الصور',label:'أقسام معرض الصور',empty:'لا توجد صور في هذا القسم حاليًا.'}};
export default function ProjectGallery({items,labels,locale,filters=DEFAULT_GALLERY_FILTERS}: ComponentProps<typeof Gallery> & {locale:Locale;projectSlug:string;filters?:GalleryFilter[]}) {
  const [selection,setSelection]=useState('');
  const selected=filters.some(filter=>filter.id===selection)?selection:'';
  const visible=selected?items.filter(item=>galleryPhotoCategory(item,filters)===selected):items;
  const c=copy[locale];
  return <>
    <div role="group" aria-label={c.label} className="mb-7 flex flex-wrap gap-2">
      {[{id:'',label:{fr:c.all,en:c.all,ar:c.all}},...filters].map(filter=><button key={filter.id} type="button" aria-pressed={selected===filter.id} onClick={()=>setSelection(filter.id)} className={`rounded-full border px-4 py-3 text-sm transition-colors ${selected===filter.id?'border-ink bg-ink text-white':'border-ink/20 bg-white text-ink hover:border-gold-500'}`}>{filter.label[locale]||filter.label.fr}</button>)}
    </div>
    <p role="status" className="sr-only">{visible.length} {locale==='ar'?'صورة':locale==='en'?'photos':'photos'}</p>
    {visible.length?<Gallery locale={locale} key={selected} items={visible} labels={labels}/>:<p role="status" className="rounded-xl border border-dashed border-ink/15 p-8 text-center text-ink/60">{c.empty}</p>}
  </>;
}
