

import { readDb, readMedia } from '@/lib/db';
import { getSession } from '@/lib/session';
export const runtime='nodejs';
export async function GET(_: Request, {params}: {params: Promise<{id:string}>}) {
  const {id}=await params;
  if(!/^[a-f0-9-]{36}$/.test(id)) return new Response(null,{status:404});
  const db=(await readDb()); const file=db.uploads?.find(f=>f.id===id);
  if(!file) return new Response(null,{status:404});
  if(!file.public) {
    const session=await getSession(); const user=session ? db.users.find(u=>u.id===session.sub) : undefined;
    const project=db.projects.find(p=>p.slug===user?.projectSlug);
    const lot=project?.lots.find(l=>l.ref===user?.lotRef);
    const allowed=user && (user.role==='admin' || (file.clientId===user.id && user.documents?.some(d=>d.href===`/api/media/${id}`)) || (!file.clientId && [...(project?.constructionPhotos??[]),...(lot?.constructionPhotos??[])].some(p=>p.src===`/api/media/${id}`)));
    if(!allowed) return new Response(null,{status:404,headers:{'Cache-Control':'private, no-store'}});
  }
  try {
    const bytes=await readMedia(id); if(!bytes) return new Response(null,{status:404});
    return new Response(bytes,{headers:{'Content-Type':file.mime,'Content-Disposition':`${file.mime==='application/pdf'?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(file.name)}`,'Cache-Control':file.public?'public, max-age=3600':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':file.public?'index':'noindex'}});
  } catch {return new Response(null,{status:404});}
}
