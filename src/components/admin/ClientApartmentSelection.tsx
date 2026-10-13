'use client';
import { useState } from 'react';
import { clientProperties } from '@/lib/client-properties';
import { StatusPinField } from './LotStatusFields';

type Project = {slug:string;name:string;lots:{ref:string;code:string;status:string;reservationNote?:string}[]};
type Client = {properties?:{projectSlug:string;lotRef:string}[];projectSlug?:string;lotRef?:string};
type Selection = {projectSlug:string;lotRef:string;status:'reserved'|'sold';reservationNote:string};
export default function ClientApartmentSelection({projects,clients}: {projects:Project[];clients:Client[]}) {
  const [slug,setSlug]=useState(projects[0]?.slug??'');
  const [ref,setRef]=useState('');
  const [selected,setSelected]=useState<Selection[]>([]);
  const occupied=clients.flatMap(clientProperties);
  const project=projects.find(project=>project.slug===slug);
  const available=project?.lots.filter(lot=>![...occupied,...selected].some(item=>item.projectSlug===slug && item.lotRef===lot.ref))??[];
  const needsPin=selected.some(item=>item.status!=='sold' && projects.find(project=>project.slug===item.projectSlug)?.lots.find(lot=>lot.ref===item.lotRef)?.status==='sold');
  function update(index:number,patch:Partial<Selection>) {setSelected(items=>items.map((item,i)=>i===index?{...item,...patch}:item));}
  return <fieldset className="space-y-4 rounded-xl border border-ink/10 p-4">
    <legend className="px-1 font-semibold">Appartements à rattacher au compte</legend>
    <input type="hidden" name="properties" value={JSON.stringify(selected)}/>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">Résidence<select className="field mt-2" value={slug} onChange={event=>{setSlug(event.target.value);setRef('');}}>{projects.map(project=><option key={project.slug} value={project.slug}>{project.name}</option>)}</select></label>
      <label className="block text-sm">Appartement<select className="field mt-2" value={ref} required={!selected.length} onChange={event=>setRef(event.target.value)}><option value="">Sélectionner un appartement</option>{available.map(lot=><option key={lot.ref} value={lot.ref}>{lot.code}</option>)}</select></label>
    </div>
    <button type="button" disabled={!ref || selected.length>=100} className="btn-ghost disabled:opacity-50" onClick={()=>{
      const lot=available.find(lot=>lot.ref===ref);if(!lot)return;
      setSelected(items=>[...items,{projectSlug:slug,lotRef:ref,status:lot.status==='sold'?'sold':'reserved',reservationNote:lot.reservationNote??''}]);setRef('');
    }}>Ajouter à la sélection</button>
    {!selected.length && <p className="text-sm text-ink/60">Ajoutez au moins un appartement, puis choisissez réservé ou vendu pour chacun.</p>}
    {selected.map((item,index)=>{
      const project=projects.find(project=>project.slug===item.projectSlug); const lot=project?.lots.find(lot=>lot.ref===item.lotRef);
      return <div key={`${item.projectSlug}/${item.lotRef}`} className="space-y-3 rounded-xl bg-sand/40 p-4">
        <div className="flex items-center justify-between gap-3"><strong className="text-sm">{project?.name} · {lot?.code}</strong><button type="button" className="text-sm text-red-700 underline" onClick={()=>setSelected(items=>items.filter((_,i)=>i!==index))}>Retirer de la sélection</button></div>
        <label className="block text-sm">Statut de cet appartement<select className="field mt-2" value={item.status} onChange={event=>update(index,{status:event.target.value as Selection['status']})}><option value="reserved">Réservé</option><option value="sold">Vendu</option></select></label>
        {item.status==='reserved' && <label className="block text-sm">Note de réservation (administration)<textarea className="field mt-2" rows={3} maxLength={2000} value={item.reservationNote} onChange={event=>update(index,{reservationNote:event.target.value})}/></label>}
      </div>;
    })}
    {needsPin && <StatusPinField/>}
    <p className="text-sm text-ink/55">La création du compte mettra à jour tous les appartements sélectionnés dans Lots et disponibilité.</p>
  </fieldset>;
}
