'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
/** Conditional, visible-only polling with jitter and bounded failure backoff. */
export default function PublicContentRefresh({initialRevision,endpoint='/api/public-revision'}:{initialRevision:string;endpoint?:string}){
 const router=useRouter();
 useEffect(()=>{
  let revision=initialRevision,active=true,pending=false,failures=0,timer:ReturnType<typeof setTimeout>;
  const schedule=()=>{clearTimeout(timer);if(active)timer=setTimeout(check,Math.min(120000,20000*2**failures)*(0.85+Math.random()*0.3));};
  const check=async()=>{
   if(!active||pending)return;if(document.visibilityState!=='visible'){schedule();return;}pending=true;
   try{
    const response=await fetch(endpoint,{headers:{'If-None-Match':`"${revision}"`},signal:AbortSignal.timeout(8000)});
    if(response.status===304){failures=0;return;}
    if(!response.ok)throw new Error('Revision unavailable');
    const next=(await response.json()).revision;
    if(typeof next==='string'&&active){if(next!==revision)router.refresh();revision=next;}failures=0;
   }catch{failures=Math.min(failures+1,3);}finally{pending=false;schedule();}
  };
  schedule();document.addEventListener('visibilitychange',check);window.addEventListener('focus',check);
  return()=>{active=false;clearTimeout(timer);document.removeEventListener('visibilitychange',check);window.removeEventListener('focus',check);};
 },[initialRevision,router,endpoint]);return null;
}
