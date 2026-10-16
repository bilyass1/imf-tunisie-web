import { requireAdminUser } from '@/lib/auth';
import { getStore } from '@/lib/postgres-store.cjs';
import { revokeOtherSessions } from '@/lib/security-actions';
export default async function SecurityPage({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params,user=await requireAdminUser(locale);
 const sessions=process.env.DATABASE_URL?(await getStore().securityQuery('SELECT created_at,last_seen,expires_at FROM imf_admin_sessions WHERE client_id=$1 AND expires_at>now() ORDER BY created_at DESC',[user.id])).rows:[];
 const keys=process.env.DATABASE_URL?(await getStore().securityQuery('SELECT created_at FROM imf_passkeys WHERE client_id=$1',[user.id])).rows:[];
 return <main className="mx-auto max-w-4xl space-y-6 px-6 py-12"><h1 className="font-serif text-3xl">Sécurité du compte</h1><p>{keys.length} clé(s) de sécurité inscrite(s). Session administrateur : 1 heure maximum, 15 minutes d’inactivité.</p><ul className="space-y-3">{sessions.map((session,index)=><li key={index} className="rounded-xl border p-4">Connexion : {String(session.created_at)} · Dernière activité : {String(session.last_seen)} · Expiration : {String(session.expires_at)}</li>)}</ul><form action={revokeOtherSessions} className="space-y-4"><label className="label" htmlFor="confirm-password">Confirmer avec votre mot de passe actuel</label><input id="confirm-password" type="password" name="password" autoComplete="current-password" required className="field"/><button className="btn-gold">Fermer toutes les sessions administrateur</button></form><p className="text-sm">La révocation vous déconnecte également. La récupération d’une clé perdue passe par l’exploitant, après vérification d’identité.</p></main>;
}
