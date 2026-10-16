import { boundedJson } from '@/lib/bounded-json';
import { visitorIdentity } from '@/lib/anonymous-limits';
import { allowRequest } from '@/lib/rate-limit';
import { getStore } from '@/lib/postgres-store.cjs';
export const runtime='nodejs';
export async function POST(request:Request){
 const denied=()=>new Response(null,{status:400,headers:{'Cache-Control':'no-store'}});
 if(process.env.NEXT_PUBLIC_WEB_VITALS_ENABLED!=='1')return new Response(null,{status:404});
 let origin:string;try{origin=new URL(process.env.APP_ORIGIN??'').origin;}catch{return new Response(null,{status:503,headers:{'Cache-Control':'no-store'}});}
 if(request.headers.get('origin')!==origin)return denied();
 try{
  const source=await visitorIdentity();
  if(!await allowRequest('web-vitals-source',source,60,60000))return new Response(null,{status:429});
  let row:Record<string,unknown>;try{row=await boundedJson(request,2048) as Record<string,unknown>;}catch{return denied();}
  if(!row||typeof row.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(row.id)||!['LCP','INP','CLS','TTFB','FCP'].includes(String(row.metric))||!['home','projects','project','apartment','search','contact','group','news','other','client','admin','login'].includes(String(row.route))||!['fr','en','ar'].includes(String(row.locale))||!['mobile','desktop'].includes(String(row.device))||typeof row.value!=='number'||!Number.isFinite(row.value)||row.value<0||row.value>3600000)return denied();
  await getStore().securityQuery(`INSERT INTO imf_web_vitals(id,metric,route,locale,device,value) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id,metric) DO UPDATE SET value=EXCLUDED.value WHERE imf_web_vitals.route=EXCLUDED.route AND imf_web_vitals.locale=EXCLUDED.locale AND imf_web_vitals.device=EXCLUDED.device`,[row.id,row.metric,row.route,row.locale,row.device,row.value]);
  return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
 }catch{console.warn(JSON.stringify({event:'web_vitals_unavailable'}));return new Response(null,{status:503,headers:{'Cache-Control':'no-store'}});}
}
