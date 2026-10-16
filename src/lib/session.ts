import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { getAuthUserById } from './db';
import fs from 'node:fs';
import path from 'node:path';
import { getStore } from './postgres-store.cjs';
import { randomUUID, randomBytes } from 'node:crypto';

const COOKIE = 'imf_session';
const MAX_AGE = 60 * 60 * 24 * 7;
const ADMIN_MAX_AGE=60*60;
const ADMIN_IDLE=15*60;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if(value && value.length>=32 && !value.startsWith('changez-')) return new TextEncoder().encode(value);
  if(process.env.NODE_ENV==='production' || process.env.VERCEL) throw new Error('AUTH_SECRET doit être configuré avec au moins 32 caractères aléatoires.');
  // A local installation gets its own persistent random secret, never a shared default.
  const file=path.join(process.cwd(),'data','session-secret');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  if(!fs.existsSync(file)) {try{fs.writeFileSync(file,randomBytes(48).toString('hex'),{flag:'wx',mode:0o600});}catch(error){if(!fs.existsSync(file)) throw error;}}
  return new TextEncoder().encode(fs.readFileSync(file,'utf8'));
}

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: 'client' | 'admin';
  authVersion?: number;
  mfa?: boolean;
}

export async function createSession(payload: SessionPayload): Promise<void> {
  if(payload.role==='admin' && process.env.NODE_ENV==='production' && !payload.mfa)throw new Error('Clé de sécurité administrateur requise.');
  const lifetime=payload.role==='admin'?ADMIN_MAX_AGE:MAX_AGE;
  const sessionId=randomUUID();
  if(payload.role==='admin' && process.env.DATABASE_URL) {
    await getStore().securityQuery('DELETE FROM imf_admin_sessions WHERE expires_at<now()');
    await getStore().securityQuery("INSERT INTO imf_admin_sessions(id,client_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",[sessionId,payload.sub]);
  }
  const token = await new SignJWT({ ...payload, authVersion: (await getAuthUserById(payload.sub))?.authVersion ?? 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime(`${lifetime}s`)
    .sign(secret());

  const store = await cookies();
  store.delete('imf_admin_activity');
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: lifetime,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token=store.get(COOKIE)?.value;
  if(token&&process.env.DATABASE_URL){try{const {payload}=await jwtVerify(token,secret(),{algorithms:['HS256']});if(payload.jti)await getStore().securityQuery('DELETE FROM imf_admin_sessions WHERE id=$1',[payload.jti]);}catch{}}
  store.delete(COOKIE);
  store.delete('imf_admin_activity');
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(),{algorithms:['HS256']});
    const user=typeof payload.sub==='string'?(await getAuthUserById(payload.sub)):undefined;
    if(!user || payload.role!==user.role || (payload.authVersion??0)!==(user.authVersion??0)) return null;
    if(user.role==='admin') {
      if(process.env.NODE_ENV==='production' && payload.mfa!==true)return null;
      if(process.env.DATABASE_URL && (!payload.jti || !(await getStore().securityQuery('SELECT 1 FROM imf_admin_sessions WHERE id=$1 AND client_id=$2 AND expires_at>now()',[payload.jti,user.id])).rows.length))return null;
      const now=Math.floor(Date.now()/1000);
      if(typeof payload.iat!=='number' || now-payload.iat>ADMIN_MAX_AGE) return null;
      // Signed activity timestamp; refreshed by authenticated heartbeat/actions only.
      const activity=store.get('imf_admin_activity')?.value;
      let last=payload.iat;
      if(activity){try{const {payload:a}=await jwtVerify(activity,secret(),{algorithms:['HS256']});if(a.sub===user.id&&a.session===payload.jti&&typeof a.at==='number')last=a.at;}catch{return null;}}
      if(now-last>ADMIN_IDLE) return null;
    }
    return {sub:user.id,email:user.email,name:user.name,role:user.role,authVersion:user.authVersion??0,mfa:payload.mfa===true};
  } catch {
    return null;
  }
}

export async function touchAdminSession() {
  const user=await getSession();if(user?.role!=='admin')return false;
  const store=await cookies(),token=store.get(COOKIE)?.value;
  const {payload}=await jwtVerify(token!,secret(),{algorithms:['HS256']});
  if(process.env.DATABASE_URL)await getStore().securityQuery('UPDATE imf_admin_sessions SET last_seen=now() WHERE id=$1',[payload.jti]);
  const activity=await new SignJWT({sub:user.sub,session:payload.jti,at:Math.floor(Date.now()/1000)}).setProtectedHeader({alg:'HS256'}).setExpirationTime('15m').sign(secret());
  store.set('imf_admin_activity',activity,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:ADMIN_IDLE});return true;
}
