import { getSession } from '@/lib/session';
import { getClientRevision } from '@/lib/db';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex'};
 const user=await getSession();if(user?.role!=='client')return new Response(null,{status:401,headers});
 const revision=await getClientRevision(user.sub),etag=`"${revision}"`;
 if(request.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers:{...headers,ETag:etag}});
 return Response.json({revision},{headers:{...headers,ETag:etag}});
}
