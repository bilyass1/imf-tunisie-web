/** Never send URLs, query strings, account IDs or apartment references in telemetry. */
export function vitalRoute(path:string):{route:string;locale:'fr'|'en'|'ar'}|undefined {
 const parts=path.split('/').filter(Boolean),locale=parts[0];
 if(locale!=='fr'&&locale!=='en'&&locale!=='ar')return;
 const section=parts[1];
 const route=!section?'home':section==='admin'?'admin':section==='espace-client'?'client':section==='connexion'?'login':section==='projets'?(parts[3]==='appartements'?'apartment':parts[2]?'project':'projects'):({recherche:'search',contact:'contact',groupe:'group',actualites:'news'} as Record<string,string>)[section]??'other';
 return {route,locale};
}
