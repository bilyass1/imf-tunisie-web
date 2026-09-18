import { NextResponse, type NextRequest } from 'next/server';
import { locales, defaultLocale } from '@/i18n/config';

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
    const response = NextResponse.next();
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
