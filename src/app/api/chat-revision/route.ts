import { getSession } from '@/lib/session';
import { getConversationRevision } from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET() {
  const session=await getSession();
  if(!session) return new Response(null,{status:401,headers:{'Cache-Control':'private, no-store'}});
  const revision=await getConversationRevision(session.sub,session.role==='admin');
  return Response.json({revision},{headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex'}});
}
