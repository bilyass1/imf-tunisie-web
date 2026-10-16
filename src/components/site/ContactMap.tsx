'use client';
import { useState } from 'react';
import type {Locale} from '@/i18n/config';
const copy={fr:{open:'Afficher la carte',external:'Itinéraire vers notre agence',title:'IMF — Sfax'},en:{open:'Show map',external:'Directions to our office',title:'IMF — Sfax'},ar:{open:'عرض الخريطة',external:'الاتجاهات إلى مكتبنا',title:'إي إم إف — صفاقس'}};
export default function ContactMap({locale}:{locale:Locale}){
 const [open,setOpen]=useState(false),labels=copy[locale];
 const query='Route Teniour Km 1, Sfax, Tunisie';
 return <div className="mt-6 overflow-hidden rounded-2xl border border-ink/15 bg-white">
  <div className="h-[280px]">
   {open?<iframe title={labels.title} src={`https://maps.google.com/maps?${new URLSearchParams({q:query,z:'14',output:'embed',hl:locale})}`} className="h-full w-full border-0" referrerPolicy="no-referrer"/>:<div className="grid h-full place-content-center gap-4 bg-sand p-6 text-center"><p className="font-display text-xl">{labels.title}</p><button type="button" className="btn-ghost" onClick={()=>setOpen(true)}>{labels.open}</button></div>}
  </div>
  <a className="flex min-h-11 items-center justify-center px-4 py-3 text-center text-sm underline" href={`https://www.google.com/maps/search/?${new URLSearchParams({api:'1',query})}`} target="_blank" rel="noopener noreferrer">{labels.external}</a>
 </div>;
}
