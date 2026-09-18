'use client';
import { useId, useState } from 'react';

export default function PasswordField({label,name,autoComplete='new-password',minLength=12,locale='fr'}:{label:string;name:string;autoComplete?:'new-password'|'current-password';minLength?:number;locale?:string}) {
  const id=useId(); const [visible,setVisible]=useState(false);
  const toggle=locale==='ar'?(visible?'إخفاء':'إظهار'):locale==='en'?(visible?'Hide':'Show'):(visible?'Masquer':'Afficher');
  return <div className="text-sm"><label htmlFor={id}>{label}</label><div className="relative mt-2"><input id={id} name={name} type={visible?'text':'password'} required minLength={minLength} autoComplete={autoComplete} className="field !pe-28"/><button type="button" aria-controls={id} aria-pressed={visible} aria-label={`${toggle} — ${label}`} onClick={()=>setVisible(!visible)} className="absolute end-3 top-1/2 -translate-y-1/2 rounded px-2 py-2 text-sm font-medium text-gold-700">{toggle}</button></div></div>;
}
