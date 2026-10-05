'use client';

import { useState } from 'react';
import Link from 'next/link';
import PlanViewer, { type PlanLabels } from './PlanViewer';
import type { PlanBrandDetails } from './PlanBrand';
import type { Lot } from '@/lib/types';
import type { Locale } from '@/i18n/config';
import { formatArea } from '@/lib/format';

const blocks = [
  { id: 'A1', plan: '/plans/diar-al-yassamine/presentation/RDC-A1' },
  { id: 'A2', plan: '/plans/diar-al-yassamine/presentation/RDC-A2' },
  { id: 'A3', plan: '/plans/diar-al-yassamine/presentation/RDC-A3' },
  { id: 'A4', plan: null },
  { id: 'A5.a', plan: '/models/yassamine/presentation/A5a-0' },
  { id: 'A5.b', plan: '/models/yassamine/presentation/A5b-0' },
  { id: 'A6.a', plan: '/models/yassamine/presentation/A6a-0' },
  { id: 'A6.b', plan: '/models/yassamine/presentation/A6b-0' },
  { id: 'A7', plan: null },
] as const;

export default function YassaminePlanLibrary({ locale, lots, labels, statuses, planContact }: {
  locale: Locale; lots: Lot[]; labels: PlanLabels; statuses: Record<Lot['status'],string>;
  planContact: Pick<PlanBrandDetails, 'phone' | 'email' | 'website'>;
}) {
  const [block,setBlock]=useState<(typeof blocks)[number]['id']>('A1');
  const text=locale==='ar' ? {
    title:'مخططات الطابق الأرضي للعمارات',body:'اختر العمارة للاطلاع على مخططها والشقق المدرجة. تظهر العمارات التي لا يتوفر لها مخطط موثّق بوضوح.',open:'عرض الشقة',block:'عمارة',ground:'الطابق الأرضي',area:'المساحة',garden:'حديقة',terrace:'شرفة',missingPlan:'لا يتوفر حالياً مخطط موثّق للطابق الأرضي لهذه العمارة على الموقع.',noLots:'لا توجد صفحات شقق موثّقة منشورة لهذا الطابق.',contact:'الاستفسار عن هذه العمارة',
  } : locale==='en' ? {
    title:'Ground-floor plans by block',body:'Choose a block to view its plan and listed apartments. Blocks without a verified plan are clearly marked.',open:'View apartment',block:'Block',ground:'Ground floor',area:'Floor area',garden:'Garden',terrace:'Terrace',missingPlan:'No verified ground-floor plan for this block is currently available on the site.',noLots:'No verified apartment pages are published for this floor.',contact:'Ask about this block',
  } : {
    title:'Plans du rez-de-chaussée par bloc',body:'Choisissez un bloc pour consulter son plan et les appartements référencés. Les blocs sans plan vérifié sont indiqués.',open:'Voir l’appartement',block:'Bloc',ground:'Rez-de-chaussée',area:'Surface de plancher',garden:'Jardin',terrace:'Terrasse',missingPlan:'Aucun plan vérifié du rez-de-chaussée de ce bloc n’est actuellement disponible sur le site.',noLots:'Aucune fiche d’appartement vérifiée n’est publiée pour cet étage.',contact:'Se renseigner sur ce bloc',
  };
  const selected=blocks.find(item=>item.id===block)!;
  const visible=lots.filter(l=>l.block===block&&l.floor===0);
  return <section id="plans-rdc" className="scroll-mt-[170px] bg-ivory py-20">
    <div className="container-lux">
      <p className="eyebrow">Diar El Yassamine</p><h2 className="h-display mt-4 text-3xl sm:text-4xl">{text.title}</h2><p className="mt-4 text-ink/60">{text.body}</p>
      <div className="my-7 flex flex-wrap gap-3" role="group" aria-label={text.title}>{blocks.map(item=><button key={item.id} type="button" aria-pressed={item.id===block} onClick={()=>setBlock(item.id)} className={`rounded-full border px-5 py-3 text-sm ${item.id===block?'border-ink bg-ink text-white':item.plan?'border-ink/20 bg-white text-ink':'border-ink/15 bg-white/50 text-ink/55'}`}>{text.block} {item.id}{!item.plan && <span className="ms-2 text-[11px]">· {locale==='ar'?'دون مخطط':locale==='en'?'No plan':'Sans plan'}</span>}</button>)}</div>
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>{selected.plan ? <PlanViewer key={block} image={`${selected.plan}.webp`} pdf={`${selected.plan}.pdf`} alt={`${text.ground} ${block}`} labels={labels} exists brand={{ project: 'Diar El Yassamine', document: `${text.block} ${block} · ${text.ground}`, ...planContact }} /> : <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-white/60 p-8 text-center"><p className="font-display text-2xl">{text.block} {block}</p><p className="mt-3 max-w-md text-sm text-ink/60">{text.missingPlan}</p><Link href={`/${locale}/contact`} className="btn-ghost mt-6">{text.contact}</Link></div>}
        </div>
        <div className="space-y-4">{visible.length===0 && <p className="rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink/60">{text.noLots}</p>}{visible.map(lot=><article key={lot.ref} className="rounded-2xl border border-ink/10 bg-white p-6">
          <div className="flex items-center justify-between gap-3"><h3 className="font-display text-2xl">{lot.code}</h3><span className={`rounded-full px-3 py-1 text-xs ${lot.status==='available'?'bg-emerald-50 text-emerald-800':lot.status==='reserved'?'bg-gold-100 text-gold-700':lot.status==='sold'?'bg-red-50 text-red-700':'bg-slate-50 text-slate-700'}`}>{statuses[lot.status]}</span></div>
          <p className="mt-2 text-sm text-ink/60">{lot.typology} · {text.ground}</p>
          <dl className="my-5 space-y-2 text-sm"><div className="flex justify-between"><dt>{text.area}</dt><dd className="font-semibold">{formatArea(lot.sellableArea,locale)}</dd></div>
            {lot.gardenArea&&<div className="flex justify-between"><dt>{text.garden}</dt><dd>{formatArea(lot.gardenArea,locale)}</dd></div>}
            {lot.terraceArea&&<div className="flex justify-between"><dt>{text.terrace}</dt><dd>{formatArea(lot.terraceArea,locale)}</dd></div>}
          </dl><Link href={`/${locale}/projets/diar-al-yassamine/appartements/${lot.ref}#plan`} className="text-sm font-semibold text-gold-700 underline underline-offset-4">{text.open} →</Link>
        </article>)}</div>
      </div>
    </div>
  </section>;
}
