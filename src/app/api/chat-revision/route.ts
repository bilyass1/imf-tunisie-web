import { createHash } from 'node:crypto';
import { getSession } from '@/lib/session';
import { readDb } from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET() {
  const session=await getSession();
  if(!session) return new Response(null,{status:401,headers:{'Cache-Control':'private, no-store'}});
  const users=readDb().users;
  const visible=session.role==='admin'?users.filter(u=>u.role==='client'):users.filter(u=>u.id===session.sub);
  const revision=createHash('sha256').update(JSON.stringify(visible.map(u=>({id:u.id,name:u.name,messages:u.messages})))).digest('hex');
  return Response.json({revision},{headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex'}});
}
