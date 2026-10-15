import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireAdminUser } from '@/lib/auth';
import { getAuditEvents } from '@/lib/db';
import PortalShell from '@/components/portal/PortalShell';
import { adminNav } from '@/components/portal/clientNav';

export default async function AuditPage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;if(!isLocale(locale))notFound();const user=await requireAdminUser(locale),dict=getDictionary(locale),events=await getAuditEvents();
  return <PortalShell locale={locale} title="Journal d’audit" userName={user.name} nav={adminNav(locale,dict)} active="audit" backLabel={dict.auth.backToSite} logoutLabel={dict.auth.logout} accent="admin" wide>
    <p className="mb-5 text-sm text-ink/60">100 dernières opérations enregistrées. Les identifiants personnels, mots de passe et contenus privés sont masqués. Les événements PostgreSQL ne peuvent pas être modifiés ou supprimés par l’application.</p>
    <div className="space-y-3">{events.length?events.map(event=><details key={event.id} className="rounded-xl border border-ink/10 bg-white p-4"><summary className="cursor-pointer text-sm"><strong>{event.operation}</strong> · {new Date(event.at).toLocaleString(locale==='ar'?'ar-TN':locale==='en'?'en-GB':'fr-TN',{timeZone:'Africa/Tunis'})} · {event.actorId}</summary><div className="mt-4 space-y-3">{event.changes.map(change=><div key={change.target}><strong className="text-sm">{change.target}</strong><pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-sand/40 p-3 text-xs">{JSON.stringify({avant:change.before,après:change.after},null,2)}</pre></div>)}</div></details>):<p>Aucune opération enregistrée.</p>}</div>
  </PortalShell>;
}
