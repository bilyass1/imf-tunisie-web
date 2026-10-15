import type { Localized } from './types';

export type GalleryFilter = { id: string; label: Localized };
export const MAX_GALLERY_FILTERS = 7;
export const DEFAULT_GALLERY_FILTERS: GalleryFilter[] = [
  {id:'perspectives',label:{fr:'Perspectives 3D',en:'3D perspectives',ar:'تصورات ثلاثية الأبعاد'}},
  {id:'works',label:{fr:'Chantier et réalisations',en:'Construction and completed works',ar:'الأشغال والمنجزات'}},
  {id:'interiors',label:{fr:'Intérieurs',en:'Interiors',ar:'المساحات الداخلية'}},
];
export function projectGalleryFilters(project: {galleryFilters?: GalleryFilter[]}) {
  return project.galleryFilters ?? DEFAULT_GALLERY_FILTERS;
}
export function parseGalleryFilters(raw: string): GalleryFilter[] {
  if(raw.length>15000) throw new Error('Liste de filtres trop longue.');
  let entries: unknown;
  try { entries=JSON.parse(raw); } catch { throw new Error('Filtres de galerie invalides.'); }
  if(!Array.isArray(entries) || entries.length>MAX_GALLERY_FILTERS) throw new Error('La galerie accepte au maximum 7 filtres.');
  const seen=new Set<string>();
  return entries.map(item=>{
    if(!item || typeof item.id!=='string' || !/^[a-z][a-z0-9-]{0,63}$/.test(item.id) || ['all','general'].includes(item.id) || seen.has(item.id)) throw new Error('Identifiant de filtre invalide ou dupliqué.');
    const fr=typeof item.label?.fr==='string'?item.label.fr.trim():'';
    const en=typeof item.label?.en==='string'?item.label.en.trim():'';
    const ar=typeof item.label?.ar==='string'?item.label.ar.trim():'';
    if(!fr || [fr,en,ar].some(label=>label.length>80)) throw new Error('Chaque filtre doit avoir un nom français de 80 caractères maximum.');
    seen.add(item.id);return {id:item.id,label:{fr,en:en||fr,ar:ar||fr}};
  });
}
export function galleryPhotoCategory(photo: {src:string;category?:string}, filters: GalleryFilter[]) {
  if(photo.category) return filters.some(filter=>filter.id===photo.category)?photo.category:'';
  const path=photo.src.split('?')[0].toLowerCase();
  const inferred=/\/(?:int-\d+|interior[^/]*|interieur[^/]*)\./.test(path)?'interiors':/\/(?:reel-\d+|chantier[^/]*|works[^/]*)\./.test(path)?'works':'perspectives';
  return filters.some(filter=>filter.id===inferred)?inferred:'';
}
