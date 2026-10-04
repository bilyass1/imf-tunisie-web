'use client';
import { useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { formatArea, formatMoney, floorLabel } from '@/lib/format';
import { defaultFilters, readFilters, filterProperties, propertyHref, visitHref, type PropertyListing, type PropertyFilters } from '@/lib/property-search';
import { propertyCopy } from '@/lib/property-copy';
import { projectMap } from '@/lib/project-maps';
import PropertyActions, { usePropertySelection } from './PropertySelection';

export function PropertyCard({ item, locale }: { item: PropertyListing; locale: Locale }) {
  const c = propertyCopy[locale];
  return <article className="min-w-0 overflow-hidden rounded-2xl border border-ink/10 bg-white">
    <Link prefetch={false} href={propertyHref(locale,item)} className="relative block aspect-[16/10] bg-sand">
      <Image src={item.image} alt={`${item.projectName} · ${item.code}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
      <span className="absolute start-3 top-3 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink">{c[item.status]}</span>
    </Link>
    <div className="space-y-4 p-5">
      <p className="text-sm text-ink/65">{item.projectName} · {item.city}</p>
      <h2 className="font-display text-2xl"><Link prefetch={false} href={propertyHref(locale,item)}>{item.code} · {item.typology}</Link></h2>
      <p className="text-sm">{formatArea(item.area,locale)} · {floorLabel(item.floor,locale)}</p>
      <p className="text-lg font-semibold text-gold-700">{item.price ? formatMoney(item.price,locale) : c.request}</p>
      <PropertyActions id={item.id} locale={locale} />
      <Link prefetch={false} className="block text-sm font-semibold underline underline-offset-4" href={propertyHref(locale,item)}>{c.details} →</Link>
    </div>
  </article>;
}

export default function PropertyExplorer({ listings, locale }: { listings: PropertyListing[]; locale: Locale }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const filters = useMemo(() => readFilters(new URLSearchParams(params.toString())), [params]);
  const c = propertyCopy[locale];
  const selection = usePropertySelection();
  const [limit,setLimit] = useState(12);
  const [mapOpen,setMapOpen] = useState(false);
  const [mapProject,setMapProject] = useState('');
  const results = useMemo(() => filterProperties(listings,filters),[listings,filters]);
  const projects = [...new Map(listings.map(l => [l.project,l])).values()];
  const mapProjects = [...new Map(results.map(l => [l.project,l])).values()];
  const mapped = mapProjects.find(p => p.project === mapProject) ?? mapProjects[0];
  const map = mapped ? projectMap(mapped.project, mapped.mapQuery, locale) : undefined;
  const invalidRange = (filters.minPrice !== '' && filters.maxPrice !== '' && Number(filters.minPrice) > Number(filters.maxPrice))
    || (filters.minArea !== '' && filters.maxArea !== '' && Number(filters.minArea) > Number(filters.maxArea));
  const help = {
    fr: { range: 'Le minimum doit être inférieur ou égal au maximum.', contact: 'Être accompagné dans ma recherche', hint: 'Élargissez vos critères ou demandez à notre équipe de vous aider.' },
    en: { range: 'The minimum must not exceed the maximum.', contact: 'Get help finding a property', hint: 'Broaden your criteria or ask our team for help.' },
    ar: { range: 'يجب ألا يتجاوز الحد الأدنى الحد الأقصى.', contact: 'مساعدتي في البحث عن عقار', hint: 'وسّع معايير البحث أو اطلب المساعدة من فريقنا.' },
  }[locale];
  function reset() { window.history.replaceState(null, '', pathname); setLimit(12); }
  function change(key: keyof PropertyFilters, value: string) {
    const next = { ...filters, [key]: value };
    const query = new URLSearchParams();
    for (const k of Object.keys(next) as (keyof PropertyFilters)[]) if (next[k] !== defaultFilters[k]) query.set(k,next[k]);
    window.history.replaceState(null,'',`${pathname}${query.size ? `?${query}` : ''}`);
    setLimit(12);
  }
  return <div className="space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-ink/70">{c.intro}</p>
      <Link className="btn-ghost" href={`/${locale}/selection`}>{c.selection} · {selection.favourites.length} ♥ · {selection.comparison.length} ↔</Link>
    </div>
    <form onSubmit={e=>e.preventDefault()} className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4" role="search">
      <label className="sm:col-span-2"><span className="label">{c.search}</span><input type="search" className="field" maxLength={150} value={filters.q} onChange={e=>change('q',e.target.value)}/></label>
      <label><span className="label">{c.city}</span><select className="field" value={filters.city} onChange={e=>change('city',e.target.value)}><option value="">{c.all}</option>{[...new Set(listings.map(l=>l.city))].sort().map(city=><option key={city}>{city}</option>)}</select></label>
      <label><span className="label">{c.project}</span><select className="field" value={filters.project} onChange={e=>change('project',e.target.value)}><option value="">{c.all}</option>{projects.map(p=><option value={p.project} key={p.project}>{p.projectName}</option>)}</select></label>
      {(['minPrice','maxPrice','minArea','maxArea'] as const).map(key=><label key={key}><span className="label">{c[key]}</span><input className="field" type="number" inputMode="decimal" min="0" step="any" value={filters[key]} onChange={e=>change(key,e.target.value)}/></label>)}
      <label><span className="label">{c.bedrooms}</span><select className="field" value={filters.bedrooms} onChange={e=>change('bedrooms',e.target.value)}><option value="">{c.all}</option>{[...new Set(listings.map(l=>l.bedrooms))].sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n} · S+{n}</option>)}</select></label>
      <label><span className="label">{c.status}</span><select className="field" value={filters.status} onChange={e=>change('status',e.target.value)}><option value="">{c.all}</option>{(['available','reserved','sold','unconfirmed'] as const).map(s=><option key={s} value={s}>{c[s]}</option>)}</select></label>
      <label><span className="label">{c.sort}</span><select className="field" value={filters.sort} onChange={e=>change('sort',e.target.value)}>{[['reference',c.reference],['price-asc',c.priceAsc],['price-desc',c.priceDesc],['area-asc',c.areaAsc],['area-desc',c.areaDesc]].map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
      <button className="btn-ghost self-end" type="button" onClick={reset}>{c.reset}</button>
      {invalidRange && <p role="alert" className="text-sm text-red-700 sm:col-span-2 lg:col-span-4">{help.range}</p>}
    </form>
    <div className="flex flex-wrap items-center justify-between gap-4"><p aria-live="polite">{results.length} {c.results}</p><button type="button" className="btn-ghost" aria-expanded={mapOpen} aria-controls="property-map" onClick={()=>setMapOpen(v=>!v)}>{c.map}</button></div>
    {mapOpen && <section id="property-map" className="rounded-2xl border border-ink/10 bg-white p-5">
      {mapped ? <>
        <label><span className="label">{c.mapSelect}</span><select className="field mb-4" value={mapped.project} onChange={e=>setMapProject(e.target.value)}>{mapProjects.map(p=><option key={p.project} value={p.project}>{p.projectName} · {results.filter(l=>l.project===p.project).length} {c.results}</option>)}</select></label>
        <iframe key={map?.embedUrl} title={`${c.map} · ${mapped.projectName}`} src={map?.embedUrl} className="h-80 w-full rounded-xl border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        <p className="my-3 text-sm text-ink/65">{mapped.address}{!map?.ownerProvided && <> — {c.mapHint}</>}</p>
        <a className="text-sm underline" href={map?.externalUrl} target="_blank" rel="noopener noreferrer">{c.mapExternal}</a>
      </> : <p>{c.empty}</p>}
    </section>}
    {results.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{results.slice(0,limit).map(item=><PropertyCard key={item.id} item={item} locale={locale}/>)}</div> : <div className="space-y-5 rounded-2xl bg-white p-6 text-center sm:p-10"><p className="font-semibold">{c.empty}</p><p>{help.hint}</p><div className="flex flex-wrap justify-center gap-3"><button type="button" className="btn-ghost" onClick={reset}>{c.reset}</button><Link className="btn-gold" href={`/${locale}/contact`}>{help.contact}</Link></div></div>}
    {results.length>limit && <button type="button" className="btn-ghost" onClick={()=>setLimit(v=>v+12)}>{c.more}</button>}
  </div>;
}

export function PropertySelectionPage({ listings, locale }: { listings: PropertyListing[]; locale: Locale }) {
  const selected = usePropertySelection();
  const c = propertyCopy[locale];
  const favourites = listings.filter(l=>selected.favourites.includes(l.id));
  const comparison = selected.comparison.map(id=>listings.find(l=>l.id===id)).filter((l): l is PropertyListing=>Boolean(l));
  const rows: [string,(l:PropertyListing)=>string][] = [
    [c.project,l=>l.projectName], [c.city,l=>l.city], [c.price,l=>l.price?formatMoney(l.price,locale):c.request],
    [c.surface,l=>formatArea(l.area,locale)], [c.bedrooms,l=>String(l.bedrooms)], [c.floor,l=>floorLabel(l.floor,locale)],
    [c.status,l=>c[l.status]], [c.garden,l=>l.garden?formatArea(l.garden,locale):'—'],
    [c.terrace,l=>l.terrace?formatArea(l.terrace,locale):'—'], [c.progress,l=>l.progress===undefined?'—':`${l.progress} %`],
  ];
  return <div className="space-y-8">
    <p>{c.savedHere}</p>
    {selected.storageError && <p role="status">{c.storageError}</p>}
    <Link className="btn-gold" href={`/${locale}/recherche`}>{c.title}</Link>
    {!selected.ready ? <div className="h-24 animate-pulse rounded-xl bg-sand" aria-busy="true"/> : <>
      {(favourites.length<selected.favourites.length || comparison.length<selected.comparison.length) && <p>{c.removed}</p>}
      <h2 className="h-display text-3xl">{c.comparison} ({comparison.length}/3)</h2>
      {comparison.length ? <div className="overflow-x-auto rounded-2xl border border-ink/15 bg-white" tabIndex={0} role="region" aria-label={c.comparison}>
        <table className="w-full min-w-[640px] text-start text-sm"><caption className="sr-only">{c.comparison}</caption><thead><tr><th className="p-5 text-start">{c.reference}</th>{comparison.map(l=><th className="p-5 text-start" key={l.id}><Link className="text-lg underline" href={propertyHref(locale,l)}>{l.code}</Link></th>)}</tr></thead>
          <tbody>{rows.map(([label,value])=><tr className="border-t border-ink/10" key={label}><th scope="row" className="p-4 text-start font-medium">{label}</th>{comparison.map(l=><td className="p-4" key={l.id}>{value(l)}</td>)}</tr>)}
            <tr className="border-t border-ink/10"><th scope="row" className="p-4 text-start">{c.visit}</th>{comparison.map(l=><td key={l.id} className="p-4">{l.status==='available'?<Link className="underline" href={visitHref(locale,l.project,l.ref)}>{c.visit}</Link>:'—'}</td>)}</tr>
            <tr><th scope="row" className="p-4 text-start">{c.comparison}</th>{comparison.map(l=><td key={l.id} className="p-4"><button type="button" className="underline" onClick={()=>selected.toggle('comparison',l.id)}>{c.compared} · {l.code}</button></td>)}</tr>
          </tbody>
        </table>
      </div> : <p>{c.noSaved}</p>}
      <h2 className="h-display text-3xl">{c.favourites} ({favourites.length})</h2>
      {favourites.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{favourites.map(item=><PropertyCard key={item.id} item={item} locale={locale}/>)}</div> : <p>{c.noSaved}</p>}
    </>}
  </div>;
}
