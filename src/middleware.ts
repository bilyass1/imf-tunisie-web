import { NextResponse, type NextRequest } from 'next/server';
import documents from '@/lib/public-documents.json';
import { locales, defaultLocale } from '@/i18n/config';
import { acceptsMarkdown, publicMarkdownPath } from '@/lib/markdown-routing';

const PUBLIC_FILE = /\.(.*)$/;

function pickLocale(request: NextRequest): string {
  const cookie = request.cookies.get('imf_locale')?.value;
  if (cookie && (locales as readonly string[]).includes(cookie)) return cookie;

  const header = request.headers.get('accept-language') ?? '';
  const preferred = header
    .split(',')
    .map((part) => part.split(';')[0].trim().slice(0, 2).toLowerCase())
    .find((code) => (locales as readonly string[]).includes(code));

  return preferred ?? defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let decoded=pathname;
  try {decoded=decodeURIComponent(pathname);}catch{return new NextResponse(null,{status:404});}
  if(/\.(dwg|skp)$/i.test(decoded) || /\/(?:sources|originals)\//i.test(decoded)) return new NextResponse(null,{status:404,headers:{'X-Robots-Tag':'noindex'}});
  if(/\.pdf$/i.test(decoded)) {
    const target=(documents.redirects as Record<string,string>)[decoded];
    if(target){const url=request.nextUrl.clone();url.pathname=target;return NextResponse.redirect(url,308);}
    if(!documents.approved.includes(decoded)) return new NextResponse(null,{status:404,headers:{'X-Robots-Tag':'noindex'}});
  }


  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/media') ||
    pathname.startsWith('/plans') ||
    pathname === '/favicon.ico' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) {
    const nonce=btoa(crypto.randomUUID());
    const dev=process.env.NODE_ENV==='development';
    const policy=`default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval' ${dev?"'unsafe-eval'":''}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' blob: https: ${dev?'ws:':''}; worker-src 'self' blob:; frame-src 'self' https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self';`;
    const requestHeaders=new Headers(request.headers);requestHeaders.set('x-nonce',nonce);requestHeaders.set('Content-Security-Policy',policy);
    requestHeaders.delete('x-markdown-path');
    const markdown = (request.method==='GET' || request.method==='HEAD') && !request.headers.has('rsc')
      && acceptsMarkdown(request.headers.get('accept')??'') && publicMarkdownPath(pathname);
    const target=request.nextUrl.clone();
    target.pathname='/api/markdown';target.search='';target.searchParams.set('path',pathname);
    // A rewrite can preserve the original request.url in production. Forward
    // the validated public path explicitly, replacing any client-supplied value.
    if(markdown) requestHeaders.set('x-markdown-path',pathname);
    const response = markdown ? NextResponse.rewrite(target,{request:{headers:requestHeaders}}) : NextResponse.next({request:{headers:requestHeaders}});
    response.headers.set('Content-Security-Policy',policy);
    response.headers.append('Vary','Accept');
    if(markdown && request.nextUrl.search) response.headers.set('X-Robots-Tag','noindex, follow');
    response.headers.append('Link', '</llms.txt>; rel="describedby"; type="text/plain", </sitemap.xml>; rel="sitemap"; type="application/xml"');
    if (/^\/(fr|en|ar)\/(admin(?:\/|$|-)|espace-client|connexion|inscription)/.test(pathname)) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  const locale = pickLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
