import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import type { Database } from './types';

export type AuditContext={actorId:string;operation:string};
export type AuditEvent=AuditContext & {id:string;at:string;changes:{target:string;before:unknown;after:unknown}[]};
const context=new AsyncLocalStorage<AuditContext>();
export function withAudit<T>(actor:AuditContext,work:()=>Promise<T>) {return context.run(actor,work);}
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)??'').digest('hex');
function safe(value:unknown,key=''):unknown {
  if(/password|secret|token|email|phone|name|body|note|label|caption|reference|href|src/i.test(key)) return value===undefined?undefined:'[redacted]';
  if(Array.isArray(value)) return value.map(item=>safe(item));
  if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,safe(item,key)]));
  return value;
}
export function createAuditEvent(before:Database,after:Database):AuditEvent {
  const actor=context.getStore()??{actorId:'system',operation:'database-write'};
  const changes:AuditEvent['changes']=[];
  for(const collection of ['users','projects','contacts','deals','tasks','activities','uploads','news'] as const) {
    const old=new Map((before[collection]??[]).map(item=>['id' in item?item.id:item.slug,item]));
    const next=new Map((after[collection]??[]).map(item=>['id' in item?item.id:item.slug,item]));
    for(const id of new Set([...old.keys(),...next.keys()])) if(digest(old.get(id))!==digest(next.get(id))) changes.push({target:`${collection}/${id}`,before:safe(old.get(id)),after:safe(next.get(id))});
  }
  if(digest(before.company)!==digest(after.company)) changes.push({target:'company',before:safe(before.company),after:safe(after.company)});
  return {...actor,id:randomUUID(),at:new Date().toISOString(),changes};
}
