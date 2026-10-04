

import { getMediaMetadata, readDb, readMedia } from '@/lib/db';
import { getSession } from '@/lib/session';
import { clientProperties } from '@/lib/client-properties';
export const runtime='nodejs';
export async function GET(_: Request, {params}: {params: Promise<{id:string}>}) {
  const {id}=await params;
  if(!/^[a-f0-9-]{36}$/.test(id)) return new Response(null,{status:404});
  const file=await getMediaMetadata(id);
  if(!file) return new Response(null,{status:404});
  if(!file.public) {
    const db=await readDb();
    const session=await getSession(); const user=session ? db.users.find(u=>u.id===session.sub) : undefined;
    const hasConstructionAccess=user?.role==='client' && clientProperties(user).some(property=>{
      const project=db.projects.find(p=>p.slug===property.projectSlug);
      const lot=project?.lots.find(l=>l.ref===property.lotRef);
      return [...(project?.constructionPhotos??[]),...(lot?.constructionPhotos??[])].some(p=>p.src===`/api/media/${id}`);
    });
    const allowed=user && (user.role==='admin' || (file.clientId===user.id && user.documents?.some(d=>d.href===`/api/media/${id}`)) || (!file.clientId && hasConstructionAccess));
    if(!allowed) return new Response(null,{status:404,headers:{'Cache-Control':'private, no-store'}});
  }
  try {
    const bytes=await readMedia(id); if(!bytes) return new Response(null,{status:404});
    return new Response(bytes,{headers:{'Content-Type':file.mime,'Content-Disposition':`${file.mime==='application/pdf'?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(file.name)}`,'Cache-Control':file.public?'public, max-age=3600':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':file.public?'index':'noindex'}});
  } catch {return new Response(null,{status:404});}
}
