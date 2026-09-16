'use client';

import { useState } from 'react';
import Link from 'next/link';
import PlanViewer, { type PlanLabels } from './PlanViewer';
import type { Lot } from '@/lib/types';
import type { Locale } from '@/i18n/config';
import { formatArea } from '@/lib/format';

export default function YassaminePlanLibrary({ locale, lots, labels, statuses }: {
  locale: Locale; lots: Lot[]; labels: PlanLabels; statuses: Record<Lot['status'],string>;
}) {
  const [block,setBlock]=useState('A1');
  const text=locale==='ar' ? {
    title:'مخططات الطابق الأرضي · A1، A2، A3',body:'اختر العمارة للاطلاع على المخطط والشقق المدرجة.',dwg:'تنزيل ملف AutoCAD الأصلي',open:'عرض الشقة',note:'معاينات مستخرجة من ملف PLAN RDC.dwg المقدم. الملف الأصلي هو المرجع.',block:'عمارة',ground:'الطابق الأرضي',area:'المساحة',garden:'حديقة',terrace:'شرفة',
  } : locale==='en' ? {
    title:'Ground-floor plans · A1, A2 & A3',body:'Choose a block to view its plan and listed apartments.',dwg:'Download original AutoCAD file',open:'View apartment',note:'Previews converted from the supplied PLAN RDC.dwg. The original drawing remains the reference.',block:'Block',ground:'Ground floor',area:'Floor area',garden:'Garden',terrace:'Terrace',
  } : {
    title:'Plans du rez-de-chaussée · A1, A2 & A3',body:'Choisissez un bloc pour consulter son plan et les appartements référencés.',dwg:'Télécharger le fichier AutoCAD original',open:'Voir l’appartement',note:'Aperçus convertis depuis le fichier PLAN RDC.dwg fourni. Le dessin original fait référence.',block:'Bloc',ground:'Rez-de-chaussée',area:'Surface de plancher',garden:'Jardin',terrace:'Terrasse',
  };
  const visible=lots.filter(l=>l.block===block&&l.planDwgUrl);
  return <section id="plans-rdc" className="scroll-mt-[170px] bg-ivory py-20">
    <div className="container-lux">
      <p className="eyebrow">Diar El Yassamine</p><h2 className="h-display mt-4 text-3xl sm:text-4xl">{text.title}</h2><p className="mt-4 text-ink/60">{text.body}</p>
      <div className="my-7 flex flex-wrap gap-3">{['A1','A2','A3'].map(b=><button key={b} aria-pressed={b===block} onClick={()=>setBlock(b)} className={`rounded-full border px-6 py-3 text-sm ${b===block?'border-ink bg-ink text-white':'border-ink/20 bg-white text-ink'}`}>{text.block} {b}</button>)}</div>
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div><PlanViewer key={block} image={`/plans/diar-al-yassamine/RDC-${block}.webp`} alt={`${text.ground} ${block}`} labels={labels} exists />
          <p className="mt-4 text-xs text-ink/55">{text.note}</p>
          <a href="/plans/diar-al-yassamine/RDC-A123.dwg" download className="btn-ghost mt-4">{text.dwg} · DWG</a>
        </div>
        <div className="space-y-4">{visible.map(lot=><article key={lot.ref} className="rounded-2xl border border-ink/10 bg-white p-6">
          <div className="flex items-center justify-between gap-3"><h3 className="font-display text-2xl">{lot.code}</h3><span className={`rounded-full px-3 py-1 text-xs ${lot.status==='available'?'bg-emerald-50 text-emerald-800':lot.status==='reserved'?'bg-amber-50 text-amber-800':'bg-sand text-ink/60'}`}>{statuses[lot.status]}</span></div>
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
