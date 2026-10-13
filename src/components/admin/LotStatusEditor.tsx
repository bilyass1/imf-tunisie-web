'use client';
import { useActionState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { commercialAction } from '@/lib/commercial-actions';
import LotStatusFields, { saleStatusLabels, type LotOwner } from './LotStatusFields';

export default function LotStatusEditor({projectSlug,lot,owner,clients=[],compact=false}: {
  projectSlug:string; lot:{ref:string;status:string;reservationNote?:string}; owner?:LotOwner; clients?:LotOwner[]; compact?:boolean;
}) {
  const [state,action,pending]=useActionState(commercialAction,{ok:false,message:''});
  const router=useRouter(); const {locale}=useParams<{locale:string}>();
  useEffect(()=>{if(state.ok) router.refresh();},[state,router]);
  const form=<form action={action} className="space-y-3">
    <input type="hidden" name="operation" value="lot-status"/>
    <input type="hidden" name="project" value={projectSlug}/>
    <input type="hidden" name="lot" value={lot.ref}/>
    {owner && <input type="hidden" name="client" value={owner.id}/>}
    <LotStatusFields currentStatus={lot.status} note={lot.reservationNote} owner={owner} clients={clients}/>
    {owner && <Link href={`/${locale}/admin/gestion?client=${encodeURIComponent(owner.id)}#client-${owner.id}`} className="block text-sm text-gold-700 underline">Ouvrir le dossier client</Link>}
    <button disabled={pending} className="btn-gold !px-4 !py-2 !text-xs disabled:opacity-50">{pending?'Enregistrement…':'Enregistrer le statut'}</button>
    {state.message && <p role="status" className={`max-w-sm text-sm ${state.ok?'text-emerald-700':'text-red-700'}`}>{state.message}</p>}
  </form>;
  return compact?<details className="max-w-sm"><summary className="cursor-pointer rounded-lg border border-ink/15 px-3 py-2 font-semibold">{saleStatusLabels[lot.status as keyof typeof saleStatusLabels]}<span className="ms-2 text-xs font-normal text-gold-700">Modifier</span></summary><div className="mt-3">{form}</div></details>:form;
}
