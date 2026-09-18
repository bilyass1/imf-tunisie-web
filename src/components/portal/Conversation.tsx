'use client';
import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { sendChatMessage } from '@/lib/chat-actions';
import type { ClientMessage } from '@/lib/types';

export function ConversationRefresh() {
  const router=useRouter();
  useEffect(()=>{
    let revision:string|undefined;let busy=false;let stopped=false;
    const controller=new AbortController();
    const refresh=async()=>{
      if(document.visibilityState!=='visible'||!navigator.onLine||busy) return;
      busy=true;
      try {
        const response=await fetch('/api/chat-revision',{cache:'no-store',signal:controller.signal});
        if(response.status===401){if(!stopped) router.refresh();return;}
        if(!response.ok) return;
        const data=await response.json();
        if(!stopped && data.revision!==revision){revision=data.revision;router.refresh();}
      } catch {/* Keep the draft intact during an interrupted connection. */}
      finally{busy=false;}
    };
    void refresh();
    const timer=setInterval(refresh,8000);
    window.addEventListener('focus',refresh);
    return ()=>{stopped=true;controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);};
  },[router]);
  return null;
}
export default function Conversation({messages,commercial=false,clientId,clientName,locale='fr'}:{messages:ClientMessage[];commercial?:boolean;clientId?:string;clientName:string;locale?:string}) {
  const [state,action,pending]=useActionState(sendChatMessage,{ok:false,message:''});
  const list=useRef<HTMLDivElement>(null);
  useEffect(()=>{const el=list.current;if(el) el.scrollTop=el.scrollHeight;},[messages.length]);
  const sorted=[...messages].sort((a,b)=>a.date.localeCompare(b.date));
  return <section className="min-w-0 overflow-hidden rounded-2xl border border-ink/10 bg-white">
    <header className="border-b border-ink/10 p-4 sm:p-5"><h2 className="font-display text-2xl">{commercial?clientName:'Votre équipe commerciale'}</h2><p className="mt-1 text-sm text-ink/55">Conversation privée · actualisation toutes les 8 secondes</p></header>
    <div ref={list} role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text" className="h-[min(50dvh,520px)] min-h-48 space-y-4 overflow-y-auto bg-sand/25 p-3 sm:p-5">
      {!sorted.length && <p className="py-12 text-center text-ink/50">Aucun message. Commencez la discussion.</p>}
      {sorted.map(m=>{const mine=m.from===(commercial?'imf':'client');return <div key={m.id} className={`flex ${mine?'justify-end':'justify-start'}`}><div className={`min-w-0 max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${mine?'rounded-br-sm bg-ink text-white':'rounded-bl-sm border border-gold-400/25 bg-white text-ink'}`}><p className={`mb-1 text-xs font-semibold ${mine?'text-gold-200':'text-gold-700'}`}>{mine?'Vous':m.from==='imf'?'Équipe IMF':clientName}</p><p className="whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-relaxed">{m.body}</p><time dateTime={m.date} className="mt-2 block text-end text-[11px] opacity-60">{new Date(m.date).toLocaleString(locale,{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Tunis'})}</time></div></div>;})}
    </div>
    <form action={action} className="space-y-3 border-t border-ink/10 p-4 sm:p-5">
      {commercial && <input name="client" type="hidden" value={clientId}/>}
      <label className="block text-sm">Votre message<textarea name="body" required maxLength={4000} rows={3} className="field mt-2" placeholder="Écrivez votre message…"/></label>
      <div className="flex flex-wrap items-center gap-4"><button disabled={pending} className="btn-gold">{pending?'Envoi…':'Envoyer'}</button><p role="status" className={`text-sm ${state.ok?'text-emerald-700':'text-red-700'}`}>{state.message}</p></div>
    </form>
  </section>;
}
