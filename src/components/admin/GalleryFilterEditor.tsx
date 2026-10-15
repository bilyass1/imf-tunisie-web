'use client';
import { useState } from 'react';
import { MAX_GALLERY_FILTERS, type GalleryFilter } from '@/lib/gallery-filters';
import AdminForm from './AdminForm';

export default function GalleryFilterEditor({projectSlug,filters:initial}: {projectSlug:string;filters:GalleryFilter[]}) {
  const [filters,setFilters]=useState(initial);
  function label(index:number,lang:'fr'|'en'|'ar',value:string) {setFilters(items=>items.map((item,i)=>i===index?{...item,label:{...item.label,[lang]:value}}:item));}
  return <AdminForm operation="gallery-filters" title="Filtres de la galerie publique">
    <input type="hidden" name="project" value={projectSlug}/><input type="hidden" name="galleryFilters" value={JSON.stringify(filters)}/>
    <p className="text-sm text-ink/60">{filters.length} / {MAX_GALLERY_FILTERS} rubriques. « Toutes les photos » est toujours affiché. Les photos d’une rubrique supprimée restent dans la galerie générale.</p>
    {filters.map((filter,index)=><fieldset key={filter.id} className="space-y-3 rounded-xl border border-ink/10 p-4">
      <legend className="px-1 text-sm font-semibold">Rubrique {index+1}</legend>
      <div className="grid gap-3 sm:grid-cols-3">{(['fr','en','ar'] as const).map(lang=><label key={lang} className="block text-sm">{lang==='fr'?'Nom français':lang==='en'?'English (facultatif)':'العربية (اختياري)'}<input className="field mt-2" value={filter.label[lang]} onChange={event=>label(index,lang,event.target.value)} required={lang==='fr'} maxLength={80} dir={lang==='ar'?'rtl':'auto'}/></label>)}</div>
      <div className="flex flex-wrap gap-3"><button type="button" disabled={index===0} className="text-sm underline disabled:opacity-30" onClick={()=>setFilters(items=>{const next=[...items];[next[index-1],next[index]]=[next[index],next[index-1]];return next;})}>Monter</button><button type="button" className="text-sm text-red-700 underline" onClick={()=>setFilters(items=>items.filter((_,i)=>i!==index))}>Retirer la rubrique</button></div>
    </fieldset>)}
    <button type="button" className="btn-ghost disabled:opacity-40" disabled={filters.length>=MAX_GALLERY_FILTERS} onClick={()=>setFilters(items=>[...items,{id:`custom-${crypto.randomUUID()}`,label:{fr:'',en:'',ar:''}}])}>Ajouter un filtre</button>
  </AdminForm>;
}
