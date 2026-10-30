import { isLocale } from '@/i18n/config';

/** An allowlist shared by middleware and handler; never accepts private routes. */
export function publicMarkdownPath(pathname: string) {
  let path: string;
  try { path=decodeURIComponent(pathname).replace(/\/$/,''); } catch { return null; }
  if(/[.\\?#]/.test(path)) return null;
  const parts=path.split('/').slice(1);
  const locale=parts.shift();
  if(!locale || !isLocale(locale)) return null;
  const route=parts.join('/');
  if(!/^(?:|contact|appartements-(?:sfax|tunis)|projets(?:\/[^/]+(?:\/appartements\/[^/]+)?)?|guides(?:\/[^/]+)?)$/.test(route)) return null;
  return {locale,parts};
}
export function acceptsMarkdown(accept: string) {
  const types=accept.toLowerCase().split(',').map(value=>{
    const [type,...params]=value.trim().split(';');
    const parameter=params.map(p=>p.trim()).find(p=>p.startsWith('q='));
    const quality=parameter ? Number(parameter.slice(2)) : 1;
    return {type,quality:Number.isFinite(quality)&&quality>=0&&quality<=1?quality:0};
  });
  const quality=(type:string)=>Math.max(0,...types.filter(t=>t.type===type).map(t=>t.quality));
  return quality('text/markdown')>0 && quality('text/markdown')>=quality('text/html');
}
