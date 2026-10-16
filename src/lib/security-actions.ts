'use server';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getSession, destroySession } from './session';
import { getAuthUserById } from './db';
import { getStore } from './postgres-store.cjs';
import { allowRequest } from './rate-limit';
export async function revokeOtherSessions(form:FormData){
 const session=await getSession();
 if(session?.role!=='admin'||!process.env.DATABASE_URL)throw new Error('Accès refusé.');
 const actor=await getAuthUserById(session.sub);
 if(!actor || !await allowRequest('admin-session-revoke',actor.id,5,60000) || !await bcrypt.compare(String(form.get('password')??''),actor.passwordHash))throw new Error('Confirmation refusée.');
 const event={id:randomUUID(),at:new Date().toISOString(),actorId:actor.id,operation:'admin-session-revoke',changes:[]};
 await getStore().securityQuery('WITH removed AS (DELETE FROM imf_admin_sessions WHERE client_id=$1 RETURNING id) INSERT INTO imf_audit_events(id,at,actor_id,operation,data) VALUES($2,$3,$1,$4,$5)',[actor.id,event.id,event.at,event.operation,event]);
 await destroySession();
}
