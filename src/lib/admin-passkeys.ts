import 'server-only';
import { randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';
import { cookies } from 'next/headers';
import { getStore } from './postgres-store.cjs';
import type { User } from './types';
import { allowRequest } from './rate-limit';

function relyingParty(){
 const value=process.env.APP_ORIGIN;if(!value)throw new Error('APP_ORIGIN requis pour les clés de sécurité administrateur.');
 const url=new URL(value);if(url.origin!==value || (url.protocol!=='https:' && url.hostname!=='localhost'))throw new Error('APP_ORIGIN doit être une origine HTTPS exacte.');
 return {origin:url.origin,rpID:url.hostname};
}
const query=(sql:string,values?:unknown[])=>getStore().securityQuery(sql,values);
export async function beginAdminAuthentication(user:Pick<User,'id'|'email'|'authVersion'>,enrollmentToken:string) {
 const {rpID}=relyingParty();
 if(!await allowRequest('admin-passkey',user.id,10,600000))throw new Error('Trop de demandes.');
 const keys=(await query('SELECT id,transports FROM imf_passkeys WHERE client_id=$1',[user.id])).rows;
 const purpose=keys.length?'authenticate':'register';
 if(!keys.length){
  const expected=process.env.ADMIN_PASSKEY_ENROLLMENT_TOKEN;
  const hash=(text:string)=>createHash('sha256').update(text).digest();
  if(!expected || expected.length<32 || !enrollmentToken || !timingSafeEqual(hash(expected),hash(enrollmentToken)))throw new Error('Le jeton privé d’inscription est requis pour la première clé de cet administrateur.');
 }
 const options=keys.length?await generateAuthenticationOptions({rpID,allowCredentials:keys,userVerification:'required'}):await generateRegistrationOptions({rpID,rpName:'IMF Tunisie',userName:user.email,userID:Uint8Array.from(Buffer.from(user.id)),attestationType:'none',authenticatorSelection:{residentKey:'preferred',userVerification:'required'}});
 const id=randomUUID();
 await query('DELETE FROM imf_auth_challenges WHERE expires_at<now()');
 await query("INSERT INTO imf_auth_challenges(id,client_id,purpose,challenge,auth_version,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '5 minutes')",[id,user.id,purpose,options.challenge,user.authVersion??0]);
 (await cookies()).set('imf_admin_challenge',id,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:300});
 return {options,purpose};
}
export async function finishAdminAuthentication(response:RegistrationResponseJSON|AuthenticationResponseJSON) {
 const id=(await cookies()).get('imf_admin_challenge')?.value;if(!id)throw new Error('Défi expiré.');
 // Consume before verification. A replay, including concurrent submissions, cannot issue a session.
 const challenge=(await query('DELETE FROM imf_auth_challenges WHERE id=$1 AND expires_at>now() RETURNING *',[id])).rows[0];
 (await cookies()).delete('imf_admin_challenge');
 if(!challenge)throw new Error('Défi expiré.');
 const user=await getStore().readAuthUser('id',challenge.client_id);
 if(user?.role!=='admin' || (user.authVersion??0)!==challenge.auth_version)throw new Error('Compte modifié.');
 const {origin:expectedOrigin,rpID:expectedRPID}=relyingParty();
 if(challenge.purpose==='register'){
  // First enrollment only, never replace an existing credential through this flow.
  if((await query('SELECT 1 FROM imf_passkeys WHERE client_id=$1',[user.id])).rows.length)throw new Error('Clé déjà inscrite.');
  const result=await verifyRegistrationResponse({response:response as RegistrationResponseJSON,expectedChallenge:challenge.challenge,expectedOrigin,expectedRPID,requireUserVerification:true});
  if(!result.verified || !result.registrationInfo)throw new Error('Clé refusée.');
  const key=result.registrationInfo.credential;
  const event={id:randomUUID(),at:new Date().toISOString(),actorId:user.id,operation:'admin-passkey-register',changes:[{target:'passkeys/'+key.id,before:null,after:'[registered]'}]};
  await query('WITH saved AS (INSERT INTO imf_passkeys(id,client_id,public_key,counter,transports) VALUES($1,$2,$3,$4,$5) RETURNING id) INSERT INTO imf_audit_events(id,at,actor_id,operation,data) SELECT $6,$7,$2,$8,$9 FROM saved',[key.id,user.id,Buffer.from(key.publicKey).toString('base64url'),key.counter,JSON.stringify(key.transports??[]),event.id,event.at,event.operation,event]);
 }else{
  const key=(await query('SELECT * FROM imf_passkeys WHERE id=$1 AND client_id=$2',[response.id,user.id])).rows[0];if(!key)throw new Error('Clé refusée.');
  const result=await verifyAuthenticationResponse({response:response as AuthenticationResponseJSON,expectedChallenge:challenge.challenge,expectedOrigin,expectedRPID,requireUserVerification:true,credential:{id:key.id,publicKey:Buffer.from(key.public_key,'base64url'),counter:Number(key.counter),transports:key.transports}});
  if(!result.verified)throw new Error('Clé refusée.');
  const event={id:randomUUID(),at:new Date().toISOString(),actorId:user.id,operation:'admin-passkey-authenticate',changes:[]};
  const updated=await query('WITH changed AS (UPDATE imf_passkeys SET counter=$1 WHERE id=$2 AND counter=$3 RETURNING id) INSERT INTO imf_audit_events(id,at,actor_id,operation,data) SELECT $4,$5,$6,$7,$8 FROM changed RETURNING id',[result.authenticationInfo.newCounter,key.id,key.counter,event.id,event.at,user.id,event.operation,event]);if(!updated.rows.length)throw new Error('Clé utilisée simultanément. Réessayez.');
 }
 return user;
}
