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
  if(/password|secret|token|email|phone|name|title|address|body|note|label|caption|reference|href|src/i.test(key)) return value===undefined?undefined:'[redacted]';
  if(Array.isArray(value)) return value.map(item=>safe(item));
  if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,safe(item,key)]));
  return value;
}
export function createAuditEvent(before:Database,after:Database):AuditEvent {
  const actor=context.getStore()??{actorId:'system',operation:'database-write'};
  const changes:AuditEvent['changes']=[];
  const record=(target:string,previous:unknown,next:unknown,key='')=>{
    if(digest(previous)===digest(next))return;
    if(/password|secret|token|email|phone|name|title|address|body|note|label|caption|reference|href|src/i.test(key)){changes.push({target,before:safe(previous,key),after:safe(next,key)});return;}
    if(previous&&next&&typeof previous==='object'&&typeof next==='object'){
      if(!Array.isArray(previous)&&!Array.isArray(next)){
        const old=previous as Record<string,unknown>,fresh=next as Record<string,unknown>;
        for(const field of new Set([...Object.keys(old),...Object.keys(fresh)]))record(target+'/'+field,old[field],fresh[field],field);
        return;
      }
      if(Array.isArray(previous)&&Array.isArray(next)){
        const identity=(value:unknown)=>value&&typeof value==='object'?('id' in value?value.id:'ref' in value?value.ref:'slug' in value?value.slug:undefined):undefined;
        if([...previous,...next].every(value=>typeof identity(value)==='string')){
          const old=new Map(previous.map(value=>[identity(value),value])),fresh=new Map(next.map(value=>[identity(value),value]));
          for(const id of new Set([...old.keys(),...fresh.keys()]))record(target+'/'+id,old.get(id),fresh.get(id));return;
        }
      }
    }
    changes.push({target,before:safe(previous,key),after:safe(next,key)});
  };
  for(const collection of ['users','projects','contacts','deals','tasks','activities','uploads','news'] as const) {
    const old=new Map((before[collection]??[]).map(item=>['id' in item?item.id:item.slug,item]));
    const next=new Map((after[collection]??[]).map(item=>['id' in item?item.id:item.slug,item]));
    for(const id of new Set([...old.keys(),...next.keys()])) record(`${collection}/${id}`,old.get(id),next.get(id));
  }
  record('company',before.company,after.company);
  return {...actor,id:randomUUID(),at:new Date().toISOString(),changes};
}
