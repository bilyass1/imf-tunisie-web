'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
/** No background polling can keep an idle administrator logged in. */
export default function AdminActivity(){
 const path=usePathname();
 useEffect(()=>{
  if(!/^\/(fr|en|ar)\/admin(?:\/|$)/.test(path))return;
  let interaction=Date.now(),sent=0;
  const active=()=>{interaction=Date.now();};
  const send=()=>{if(document.visibilityState!=='visible'||interaction<=sent)return;sent=interaction;void fetch('/api/admin-activity',{method:'POST'}).then(response=>{if(response.status===401)window.location.assign(path.split('/').slice(0,2).join('/')+'/admin-connexion');}).catch(()=>{});};
  const timer=window.setInterval(send,60000);
  for(const event of ['pointerdown','keydown','touchstart'])window.addEventListener(event,active,{passive:true});
  return ()=>{window.clearInterval(timer);for(const event of ['pointerdown','keydown','touchstart'])window.removeEventListener(event,active);};
 },[path]);return null;
}
