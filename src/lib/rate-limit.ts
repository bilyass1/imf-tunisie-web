import 'server-only';
import { createHash } from 'node:crypto';
import { getStore } from './postgres-store.cjs';
import { buildSeed } from './seed';
// Local development keeps its lightweight in-memory limiter. Production uses
// one atomic PostgreSQL counter shared by all Vercel functions.
const buckets=new Map<string,{count:number;until:number}>();
export async function allowRequest(scope:string,identity:string,limit:number,windowMs:number,now=Date.now()):Promise<boolean> {
  const key=createHash('sha256').update(`${scope}:${identity}`).digest('hex');
  if(process.env.DATABASE_URL) {
    try { return await getStore(buildSeed).consumeRateLimit(key,limit,windowMs,now); }
    catch { return false; } // Never bypass the limit when shared storage is unavailable.
  }
  const current=buckets.get(key);
  if(current && current.until>now){if(current.count>=limit)return false;current.count++;return true;}
  if(buckets.size>=10000){for(const [k,v] of buckets)if(v.until<=now)buckets.delete(k);if(buckets.size>=10000)return false;}
  buckets.set(key,{count:1,until:now+windowMs});return true;
}
