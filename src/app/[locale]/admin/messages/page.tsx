import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireAdminUser } from '@/lib/auth';
import { readDb } from '@/lib/db';
import { clientProperties } from '@/lib/client-properties';
import PortalShell from '@/components/portal/PortalShell';
import { adminNav } from '@/components/portal/clientNav';
import Conversation,{ConversationRefresh} from '@/components/portal/Conversation';

export default async function CommercialMessages({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{client?:string}>}) {
  const {locale}=await params;if(!isLocale(locale)) notFound();
  const user=await requireAdminUser(locale);const dict=getDictionary(locale);
  const clients=(await readDb()).users.filter(u=>u.role==='client').sort((a,b)=>(b.messages?.at(-1)?.date??'').localeCompare(a.messages?.at(-1)?.date??''));
  const {client:id}=await searchParams;
  const selected=id?clients.find(c=>c.id===id):clients[0];
  return <PortalShell locale={locale} title="Messagerie clients" subtitle="Recevoir les demandes et répondre à chaque client" userName={user.name} nav={adminNav(locale,dict)} active="messages" backLabel={dict.auth.backToSite} logoutLabel={dict.auth.logout} accent="admin">
    <ConversationRefresh/>
    <div className="grid items-start gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Conversations clients" className="max-h-48 min-w-0 space-y-2 overflow-y-auto md:max-h-[70dvh]">{clients.map(c=>{const last=c.messages?.at(-1);const properties=clientProperties(c);return <Link key={c.id} href={`/${locale}/admin/messages?client=${encodeURIComponent(c.id)}`} aria-current={selected?.id===c.id?'page':undefined} className={`block rounded-xl border p-4 ${selected?.id===c.id?'border-gold-400 bg-gold-100/40':'border-ink/10 bg-white'}`}><strong className="block">{c.name}</strong><span className="text-xs text-ink/55">{properties.length?properties.map(item=>item.lotRef).join(' · '):'Sans appartement'} · {c.messages?.length??0} message(s)</span><p className="mt-2 truncate text-sm text-ink/70">{last?`${last.from==='client'?'Client':'IMF'} : ${last.body}`:'Commencer la discussion'}</p></Link>;})}{!clients.length && <p>Aucun compte client.</p>}</nav>
      {selected?<Conversation key={selected.id} commercial clientId={selected.id} clientName={selected.name} messages={selected.messages??[]} locale={locale}/>:<p>Sélectionnez un client dans la liste.</p>}
    </div>
  </PortalShell>;
}
