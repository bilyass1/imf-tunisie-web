/** Optional dedicated CDN for approved, public assets. Private media never leave /api/media. */
export function publicAssetUrl(path:string):string {
  if(path.includes('/presentation/') && /(?<!\.web)\.pdf(?:\?.*)?$/.test(path)) path=path.replace(/\.pdf(?=\?|$)/,'.web.pdf');
  const configured=process.env.NEXT_PUBLIC_ASSET_ORIGIN;
  if(!configured || !/^\/(?:models|draco|plans|media|interiors|360)\//.test(path)) return path;
  try {const url=new URL(configured);if(url.protocol!=='https:' || url.username || url.password)return path;return url.origin+path;}catch{return path;}
}
