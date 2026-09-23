import { getPublicRevision } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const revision = await getPublicRevision();
    return Response.json({ revision }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  } catch {
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
