import 'server-only';
import { headers, cookies } from 'next/headers';
import ipaddr from 'ipaddr.js';
import { isIP } from 'node:net';
import { randomUUID } from 'node:crypto';
import { allowRequest } from './rate-limit';

/** Only opt in after configuring a proxy that strips/overwrites this header.
 * Never infer trust from a visitor-supplied X-Forwarded-For chain. */
export async function visitorIdentity():Promise<string> {
  const trusted=process.env.TRUSTED_CLIENT_IP_HEADER?.toLowerCase();
  if(trusted) {
    if(!['cf-connecting-ip','x-real-ip','x-forwarded-for','x-vercel-forwarded-for'].includes(trusted)) throw new Error('En-tête proxy non pris en charge.');
    const ip=(await headers()).get(trusted)?.trim();
    if(!ip || !isIP(ip)) throw new Error('Adresse du proxy de confiance manquante ou ambiguë.');
    // IPv6 /64 prevents trivial address rotation within one household/network.
    const normalized=ipaddr.process(ip);
    if(normalized.kind()==='ipv6')return normalized.toNormalizedString().split(':').slice(0,4).join(':')+'::/64';
    return normalized.toString();
  }
  if(process.env.NODE_ENV==='production') throw new Error('Configurez TRUSTED_CLIENT_IP_HEADER derrière un proxy de confiance.');
  const jar=await cookies();let id=jar.get('imf_visitor')?.value;
  if(!id || !/^[a-f0-9-]{36}$/.test(id)){id=randomUUID();jar.set('imf_visitor',id,{httpOnly:true,sameSite:'lax',path:'/',maxAge:86400});}
  return id;
}
export async function allowAnonymous(action:'login'|'contact',account:string) {
  let source:string;try{source=await visitorIdentity();}catch{console.warn(JSON.stringify({event:'anonymous_identity_unavailable',action}));return false;}
  const limits=action==='login'?{source:30,pair:10,window:600000}:{source:10,pair:5,window:3600000};
  const allowed=await allowRequest(`${action}-source`,source,limits.source,60000)
    && await allowRequest(`${action}-source-account`,`${source}\0${account.toLowerCase()}`,limits.pair,limits.window)
    && await allowRequest(`${action}-emergency`,'service',10000,60000);
  if(!allowed) console.warn(JSON.stringify({event:'anonymous_rate_limited',action}));
  return allowed;
}
