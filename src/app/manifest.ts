import type { MetadataRoute } from 'next';
export default function manifest():MetadataRoute.Manifest {
  return {id:'/',name:'IMF — Immobilière Mseddi Frères',short_name:'IMF Immobilier',description:'Résidences, appartements et espace client IMF en Tunisie.',lang:'fr',start_url:'/fr',scope:'/',display:'standalone',background_color:'#f8f7f3',theme_color:'#111315',icons:[{src:'/pwa/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/pwa/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/pwa/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}],shortcuts:[{name:'Mon espace client',url:'/fr/connexion'},{name:'Nos résidences',url:'/fr/projets'}]};
}
