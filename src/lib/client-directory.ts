import 'server-only';
import type { User,ClientMessage } from './types';
import {readDb} from './db';
import {getStore} from './postgres-store.cjs';
export type ClientSummary=Pick<User,'id'|'name'|'email'|'phone'|'properties'|'projectSlug'|'lotRef'|'payments'|'paymentSchedules'> & {messageCount?:number;lastMessage?:ClientMessage};
export async function clientDirectory(after=''):Promise<{items:ClientSummary[];next?:string}>{
 if(after.length>200)throw new Error('Invalid cursor');
 if(process.env.DATABASE_URL){
  const rows=(await getStore().securityQuery(`SELECT u.id,u.email,u.project_slug,u.lot_ref,
   u.data->>'name' AS name,u.data->>'phone' AS phone,u.data->'properties' AS properties,u.data->'payments' AS payments,u.data->'paymentSchedules' AS schedules,
   (SELECT count(*)::int FROM imf_messages m WHERE m.client_id=u.id) AS message_count,
   (SELECT jsonb_build_object('id',id,'from',sender,'date',sent_at,'body',body) FROM imf_messages m WHERE m.client_id=u.id ORDER BY sent_at DESC,id DESC LIMIT 1) AS last_message
   FROM imf_users u WHERE u.role='client' AND ($1='' OR u.id>$1) ORDER BY u.id LIMIT 31`,[after])).rows;
  const items:ClientSummary[]=rows.slice(0,30).map(row=>({id:row.id,name:row.name,email:row.email,phone:row.phone,properties:row.properties??undefined,projectSlug:row.project_slug??undefined,lotRef:row.lot_ref??undefined,payments:row.payments??undefined,paymentSchedules:row.schedules??undefined,messageCount:row.message_count,lastMessage:row.last_message??undefined}));
  return {items,next:rows.length>30?items.at(-1)?.id:undefined};
 }
 const clients=(await readDb()).users.filter(u=>u.role==='client'&&u.id>after).sort((a,b)=>a.id<b.id?-1:1);
 return {items:clients.slice(0,30).map(({passwordHash:_password,authVersion:_version,documents:_docs,archivedDocuments:_archives,messages,...user})=>({...user,messageCount:messages?.length,lastMessage:messages?.at(-1)})),next:clients.length>30?clients[29].id:undefined};
}
export async function adminConversation(id:string,before?:string):Promise<{id:string;name:string;messages:ClientMessage[];next?:string}|undefined>{
 if(process.env.DATABASE_URL){
  const store=getStore(),user=(await store.securityQuery("SELECT id,data->>'name' AS name FROM imf_users WHERE id=$1 AND role='client'",[id])).rows[0];if(!user)return;
  const rows=(await store.securityQuery('SELECT id,sender,sent_at,body FROM imf_messages WHERE client_id=$1 AND ($2::text IS NULL OR (sent_at,id)<(SELECT sent_at,id FROM imf_messages WHERE client_id=$1 AND id=$2)) ORDER BY sent_at DESC,id DESC LIMIT 101',[id,before??null])).rows;
  const next=rows.length>100?rows[99].id:undefined;
  return {...user,next,messages:rows.slice(0,100).reverse().map(row=>({id:row.id,from:row.sender,date:new Date(row.sent_at).toISOString(),body:row.body}))};
 }
 const user=(await readDb()).users.find(u=>u.id===id&&u.role==='client');if(!user)return;const index=before?user.messages?.findIndex(m=>m.id===before)??0:user.messages?.length??0;const messages=user.messages?.slice(0,index)??[];return {id:user.id,name:user.name,messages:messages.slice(-100),next:messages.length>100?messages.at(-100)?.id:undefined};
}
