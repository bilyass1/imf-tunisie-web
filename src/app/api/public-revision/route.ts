import { getPublicRevision } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request:Request) {
  try {
    const started=performance.now();
    const revision = await getPublicRevision();
    const headers={'Server-Timing':`revision;dur=${(performance.now()-started).toFixed(1)}`,'Cache-Control':'public, max-age=0, s-maxage=5, stale-while-revalidate=5','X-Robots-Tag':'noindex','ETag':`"${revision}"`};
    if(request.headers.get('if-none-match')===headers.ETag)return new Response(null,{status:304,headers});
    return Response.json({revision},{headers});
  } catch {
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
