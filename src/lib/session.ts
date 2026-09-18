import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { getUserById } from './db';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const COOKIE = 'imf_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if(value && value.length>=32 && !value.startsWith('changez-')) return new TextEncoder().encode(value);
  if(process.env.VERCEL) throw new Error('AUTH_SECRET doit être configuré avec au moins 32 caractères aléatoires.');
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
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload, authVersion: (await getUserById(payload.sub))?.authVersion ?? 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(),{algorithms:['HS256']});
    const user=typeof payload.sub==='string'?(await getUserById(payload.sub)):undefined;
    if(!user || (payload.authVersion??0)!==(user.authVersion??0)) return null;
    return {sub:user.id,email:user.email,name:user.name,role:user.role,authVersion:user.authVersion??0};
  } catch {
    return null;
  }
}
