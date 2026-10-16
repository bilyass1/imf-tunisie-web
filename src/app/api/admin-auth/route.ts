import { boundedJson } from '@/lib/bounded-json';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import { finishAdminAuthentication } from '@/lib/admin-passkeys';
import { createSession } from '@/lib/session';
export const runtime='nodejs';
export async function POST(request:Request){
 const headers={'Cache-Control':'private, no-store'};
 if(!process.env.APP_ORIGIN || request.headers.get('origin')!==process.env.APP_ORIGIN)return new Response(null,{status:403,headers});
 if(Number(request.headers.get('content-length')??0)>65536)return new Response(null,{status:413,headers});
 try{
  const user=await finishAdminAuthentication(await boundedJson(request) as AuthenticationResponseJSON|RegistrationResponseJSON);
  await createSession({sub:user.id,email:user.email,name:user.name,role:'admin',mfa:true,authVersion:user.authVersion??0});
  return Response.json({ok:true},{headers});
 }catch{return Response.json({ok:false},{status:401,headers});}
}
