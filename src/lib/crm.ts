import 'server-only';
import { getStore } from './postgres-store.cjs';
import { readDb, pipelineStats, lotStats } from './db';
import type { Activity, Contact, CrmTask, Deal } from './types';
export type PageInput={limit?:number;after?:string;query?:string;stage?:string;contactId?:string};
type RowTypes={contacts:Contact & {dealCount:number;dealValue:number};deals:Deal;tasks:CrmTask;activities:Activity};
export type WithContact<T>=T & {contactName?:string;contactPhone?:string};
export async function listCrm<C extends keyof RowTypes>(collection:C,input:PageInput={}):Promise<{items:WithContact<RowTypes[C]>[];next?:string}> {
 const repository=await import('./crm-repository.cjs');
 const options=repository.pageOptions(input);
 if(process.env.DATABASE_URL)return getStore().crmList(collection,options);
 const db=await readDb();
 const rows=db[collection].filter(row=>(!options.after||row.id>options.after)&&(!options.contactId||('contactId' in row&&row.contactId===options.contactId))&&(!options.stage||('stage' in row&&row.stage===options.stage))&&(!options.query||JSON.stringify(row).toLowerCase().includes(options.query.toLowerCase()))).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 const items=rows.slice(0,options.limit).map(row=>({...row,contactName:'contactId' in row?db.contacts.find(c=>c.id===row.contactId)?.name:undefined,...(collection==='contacts'?{dealCount:db.deals.filter(d=>d.contactId===row.id).length,dealValue:db.deals.filter(d=>d.contactId===row.id).reduce((n,d)=>n+(d.value??0),0)}:{})}));
 return {items:items as unknown as WithContact<RowTypes[C]>[],next:rows.length>options.limit?items.at(-1)?.id:undefined};
}
export async function getCrmDashboard():Promise<{stats:Awaited<ReturnType<typeof pipelineStats>>;contactCount:number;hasDemo:boolean;available:number;activities:WithContact<Activity>[];tasks:WithContact<CrmTask>[]}> {
 if(process.env.DATABASE_URL)return getStore().crmDashboard();
 const [db,stats]=await Promise.all([readDb(),pipelineStats()]);
 return {stats,contactCount:db.contacts.length,hasDemo:db.contacts.some(c=>c.demo)||db.deals.some(d=>d.demo),available:db.projects.reduce((n,p)=>n+lotStats(p.lots).available,0),activities:db.activities.toSorted((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(a=>({...a,contactName:db.contacts.find(c=>c.id===a.contactId)?.name})),tasks:db.tasks.filter(t=>!t.done&&t.dueDate<=new Date().toISOString().slice(0,10)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,6).map(t=>({...t,contactName:db.contacts.find(c=>c.id===t.contactId)?.name}))};
}
