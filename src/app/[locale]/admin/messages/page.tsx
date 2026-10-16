import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireAdminUser } from '@/lib/auth';
import { clientDirectory, adminConversation } from '@/lib/client-directory';
import { clientProperties } from '@/lib/client-properties';
import PortalShell from '@/components/portal/PortalShell';
import { adminNav } from '@/components/portal/clientNav';
import Conversation,{ConversationRefresh} from '@/components/portal/Conversation';

export default async function CommercialMessages({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{client?:string;after?:string;before?:string}>}) {
  const {locale}=await params;if(!isLocale(locale)) notFound();
  const user=await requireAdminUser(locale);const dict=getDictionary(locale);
  const query=await searchParams;
  const {items:clients,next}=await clientDirectory(query.after);
  const selected=await adminConversation(query.client??clients[0]?.id??'',query.before);
  return <PortalShell locale={locale} title="Messagerie clients" subtitle="Recevoir les demandes et répondre à chaque client" userName={user.name} nav={adminNav(locale,dict)} active="messages" backLabel={dict.auth.backToSite} logoutLabel={dict.auth.logout} accent="admin">
    <ConversationRefresh/>
    <nav aria-label="Pagination" className="mb-5 flex flex-wrap gap-4"><Link className="btn-ghost" href={`/${locale}/admin/messages`}>{locale==='ar'?'البداية':locale==='en'?'First page':'Première page'}</Link>{next&&<Link className="btn-ghost" href={`/${locale}/admin/messages?${new URLSearchParams({after:next})}`}>{locale==='ar'?'التالي':locale==='en'?'Next page':'Page suivante'}</Link>}</nav>
    {selected&&<nav aria-label={locale==='ar'?'سجل المحادثة':locale==='en'?'Conversation history':'Historique de la conversation'} className="mb-4 flex flex-wrap gap-4">{selected.next&&<Link className="btn-ghost" href={`/${locale}/admin/messages?${new URLSearchParams({client:selected.id,before:selected.next,...(query.after?{after:query.after}:{})})}`}>{locale==='ar'?'رسائل أقدم':locale==='en'?'Earlier messages':'Messages précédents'}</Link>}{query.before&&<Link className="btn-ghost" href={`/${locale}/admin/messages?${new URLSearchParams({client:selected.id})}`}>{locale==='ar'?'أحدث الرسائل':locale==='en'?'Latest messages':'Derniers messages'}</Link>}</nav>}
    <p className="mb-4 text-sm text-muted">{locale==='ar'?'آخر 100 رسالة في المحادثة':locale==='en'?'100 messages per page · history preserved':'100 messages par page · historique conservé'}</p>
    <div className="grid items-start gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Conversations clients" className="max-h-48 min-w-0 space-y-2 overflow-y-auto md:max-h-[70dvh]">{clients.map(c=>{const last=c.lastMessage;const properties=clientProperties(c);return <Link key={c.id} href={`/${locale}/admin/messages?client=${encodeURIComponent(c.id)}${query.after?'&after='+encodeURIComponent(query.after):''}`} aria-current={selected?.id===c.id?'page':undefined} className={`block rounded-xl border p-4 ${selected?.id===c.id?'border-gold-400 bg-gold-100/40':'border-ink/10 bg-white'}`}><strong className="block">{c.name}</strong><span className="text-xs text-muted">{properties.length?properties.map(item=>item.lotRef).join(' · '):'Sans appartement'} · {c.messageCount??0} message(s)</span><p className="mt-2 truncate text-sm text-ink/70">{last?`${last.from==='client'?'Client':'IMF'} : ${last.body}`:'Commencer la discussion'}</p></Link>;})}{!clients.length && <p>Aucun compte client.</p>}</nav>
      {selected?<Conversation key={selected.id} commercial clientId={selected.id} clientName={selected.name} messages={selected.messages??[]} locale={locale}/>:<p>Sélectionnez un client dans la liste.</p>}
    </div>
  </PortalShell>;
}
