import 'server-only';
import { createHash } from 'node:crypto';
// Single-process protection. Replace with an atomic shared store before scaling out.
const buckets=new Map<string,{count:number;until:number}>();
export function allowRequest(scope:string,identity:string,limit:number,windowMs:number,now=Date.now()):boolean {
  const key=createHash('sha256').update(`${scope}:${identity}`).digest('hex');
  const current=buckets.get(key);
  if(current && current.until>now){if(current.count>=limit)return false;current.count++;return true;}
  if(buckets.size>=10000){for(const [k,v] of buckets)if(v.until<=now)buckets.delete(k);if(buckets.size>=10000)return false;}
  buckets.set(key,{count:1,until:now+windowMs});return true;
}
