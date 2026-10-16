

import { getMediaSize, getMediaMetadata, canReadPrivateMedia, streamMedia } from '@/lib/db';
import { getSession } from '@/lib/session';
export const runtime='nodejs';
export async function GET(request: Request, {params}: {params: Promise<{id:string}>}) {
  const {id}=await params;
  if(!/^[a-f0-9-]{36}$/.test(id)) return new Response(null,{status:404});
  const file=await getMediaMetadata(id);
  if(!file) return new Response(null,{status:404});
  if(!file.public) {
    const session=await getSession();
    const allowed=session && await canReadPrivateMedia(id,session.sub);
    if(!allowed) return new Response(null,{status:404,headers:{'Cache-Control':'private, no-store'}});
  }
  try {
    const size=await getMediaSize(id); if(!size) return new Response(null,{status:404});
    const headers=new Headers({'Content-Type':file.mime,'Content-Disposition':`${file.mime==='application/pdf'?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(file.name)}`,'Cache-Control':file.public?'public, max-age=3600':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':file.public?'index':'noindex','Accept-Ranges':'bytes'});
    const range=request.headers.get('range');
    if(range) {
      const match=/^bytes=(\d*)-(\d*)$/.exec(range);
      let start=match?.[1]?Number(match[1]):0,end=match?.[2]?Number(match[2]):size-1;
      if(match&&!match[1]&&match[2]){start=Math.max(0,size-Number(match[2]));end=size-1;}
      if(!match||(!match[1]&&!match[2])||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start){headers.set('Content-Range',`bytes */${size}`);return new Response(null,{status:416,headers});}
      end=Math.min(end,size-1);headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));const stream=await streamMedia(id,start,end,request.signal);return new Response(stream,{status:206,headers});
    }
    headers.set('Content-Length',String(size));const stream=await streamMedia(id,0,size-1,request.signal);return new Response(stream,{headers});
  } catch {return new Response(null,{status:404});}
}
