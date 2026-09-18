'use client';
import { useEffect,useState } from 'react';
type InstallEvent=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export default function PwaInstall({locale}:{locale:string}) {
  const [prompt,setPrompt]=useState<InstallEvent|null>(null);const [ios,setIos]=useState(false);const [hidden,setHidden]=useState(false);
  useEffect(()=>{
    if(!('serviceWorker' in navigator)||!window.isSecureContext) return;
    navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{});
    const installed=window.matchMedia('(display-mode: standalone)').matches || !!(navigator as Navigator & {standalone?:boolean}).standalone;
    setHidden(installed);
    setIos(!installed && /iPad|iPhone|iPod/.test(navigator.userAgent));
    const capture=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent);};
    const done=()=>{setHidden(true);setPrompt(null);};
    window.addEventListener('beforeinstallprompt',capture);window.addEventListener('appinstalled',done);
    return ()=>{window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',done);};
  },[]);
  if(hidden||(!prompt&&!ios)) return null;
  const label=locale==='ar'?'تثبيت تطبيق IMF':locale==='en'?'Install IMF app':'Installer l’application IMF';
  return <aside aria-label={label} className="fixed bottom-4 end-4 z-40 max-w-[calc(100vw-2rem)] rounded-2xl border border-gold-400/30 bg-white p-4 shadow-xl"><div className="flex items-center gap-3">{prompt?<button className="btn-gold" onClick={async()=>{try{await prompt.prompt();await prompt.userChoice;}finally{setPrompt(null);}}}>{label}</button>:<p className="max-w-xs text-sm">{locale==='ar'?'للتثبيت: مشاركة ← إضافة إلى الشاشة الرئيسية':locale==='en'?'Install: Share → Add to Home Screen':'Installer : Partager → Sur l’écran d’accueil'}</p>}<button aria-label={locale==='en'?'Close':locale==='ar'?'إغلاق':'Fermer'} onClick={()=>setHidden(true)} className="p-2">×</button></div></aside>;
}
