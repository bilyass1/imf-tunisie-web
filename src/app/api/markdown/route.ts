import { getProjects } from '@/lib/db';
import { markdownPage } from '@/lib/markdown-content';
import { publicMarkdownPath } from '@/lib/markdown-routing';

export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const path=request.headers.get('x-markdown-path')??new URL(request.url).searchParams.get('path')??'';
  if(!publicMarkdownPath(path)) return new Response(null,{status:404});
  const content=markdownPage(path,await getProjects());
  return new Response(content,{status:content===null?404:200,headers:{
    'Content-Type':'text/markdown; charset=utf-8','Vary':'Accept',
  }});
}
