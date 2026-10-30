import { getProjects } from '@/lib/db';
import { llmsText } from '@/lib/agent-content';

export const dynamic = 'force-dynamic';
export async function GET() {
  return new Response(llmsText(await getProjects(), true), { headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
  } });
}
