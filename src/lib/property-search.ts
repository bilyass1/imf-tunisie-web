import type { Locale } from '@/i18n/config';
import type { Project, LotStatus } from './types';

/** Only public, lightweight fields cross the server/client boundary. */
export interface PropertyListing {
  id: string; project: string; projectName: string; city: string; address: string;
  mapQuery: string; ref: string; code: string; typology: string; bedrooms: number;
  area?: number; price?: number; floor: number; status: LotStatus;
  garden?: number; terrace?: number; image: string; progress?: number;
}
export interface PropertyFilters {
  q: string; city: string; project: string; status: string; bedrooms: string;
  minPrice: string; maxPrice: string; minArea: string; maxArea: string; sort: string;
}
export const defaultFilters: PropertyFilters = {
  q: '', city: '', project: '', status: 'available', bedrooms: '',
  minPrice: '', maxPrice: '', minArea: '', maxArea: '', sort: 'reference',
};
export function propertyListings(projects: Project[], locale: Locale): PropertyListing[] {
  return projects.flatMap(p => p.lots.map(l => ({
    id: `${p.slug}/${l.ref}`, project: p.slug, projectName: p.name, city: p.city,
    address: p.address[locale], mapQuery: p.mapQuery, ref: l.ref, code: l.code,
    typology: l.typology, bedrooms: Number(l.typology.match(/\d+/)?.[0] ?? 0),
    area: l.sellableArea, price: l.price && l.price > 0 ? l.price : undefined,
    floor: l.floor, status: l.status, garden: l.gardenArea, terrace: l.terraceArea,
    image: l.gallery?.[0]?.src ?? p.cover, progress: l.progressPercent ?? p.progressPercent,
  })));
}
const normalized = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export function readFilters(params: URLSearchParams): PropertyFilters {
  const filters = { ...defaultFilters };
  for (const key of Object.keys(filters) as (keyof PropertyFilters)[]) {
    if (params.has(key)) filters[key] = (params.get(key) ?? '').slice(0, 150);
  }
  for (const key of ['minPrice','maxPrice','minArea','maxArea'] as const) {
    if (filters[key] && (!Number.isFinite(Number(filters[key])) || Number(filters[key]) < 0)) filters[key] = '';
  }
  if (!['', 'available', 'reserved', 'sold'].includes(filters.status)) filters.status = 'available';
  if (!['reference','price-asc','price-desc','area-asc','area-desc'].includes(filters.sort)) filters.sort = 'reference';
  return filters;
}
export function filterProperties(listings: PropertyListing[], f: PropertyFilters): PropertyListing[] {
  const inRange = (value: number | undefined, min: string, max: string) => {
    if (!min && !max) return true;
    if (value === undefined) return false;
    return (!min || value >= Number(min)) && (!max || value <= Number(max));
  };
  const result = listings.filter(l =>
    (!f.q || normalized(`${l.code} ${l.ref} ${l.projectName} ${l.city} ${l.address}`).includes(normalized(f.q))) &&
    (!f.city || l.city === f.city) && (!f.project || l.project === f.project) &&
    (!f.status || l.status === f.status) && (!f.bedrooms || l.bedrooms === Number(f.bedrooms)) &&
    inRange(l.price, f.minPrice, f.maxPrice) && inRange(l.area, f.minArea, f.maxArea));
  const [field, direction] = f.sort.split('-');
  return result.sort((a,b) => {
    if (field === 'price' || field === 'area') {
      const av = a[field], bv = b[field];
      if (av === undefined) return bv === undefined ? a.id.localeCompare(b.id) : 1;
      if (bv === undefined) return -1;
      const delta = direction === 'desc' ? bv - av : av - bv;
      if (delta) return delta;
    }
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });
}
export function propertyHref(locale: Locale, l: PropertyListing) {
  return `/${locale}/projets/${l.project}/appartements/${l.ref}`;
}
export function visitHref(locale: Locale, project: string, ref: string) {
  return `/${locale}/contact?${new URLSearchParams({ intent: 'visit', project, lot: ref })}`;
}
