import { touchAdminSession } from '@/lib/session';
export async function POST(request:Request){
 if(!process.env.APP_ORIGIN || request.headers.get('origin')!==process.env.APP_ORIGIN)return new Response(null,{status:403});
 return new Response(null,{status:await touchAdminSession()?204:401,headers:{'Cache-Control':'private, no-store'}});
}
