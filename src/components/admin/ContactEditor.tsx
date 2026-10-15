'use client';
import { useState } from 'react';
import type { Contact } from '@/lib/types';
import type { Locale } from '@/i18n/config';
import AdminForm from './AdminForm';

const copy={
  fr:{title:'Fiche contact',name:'Nom et prénom',phone:'Téléphone',email:'Adresse e-mail',city:'Ville',source:'Source',tags:'Étiquettes (séparées par des virgules)',notes:'Note',project:'Projet',lot:'Appartement',none:'Non renseigné',all:'Aucun appartement précis'},
  en:{title:'Contact details',name:'Full name',phone:'Phone',email:'Email address',city:'City',source:'Source',tags:'Tags (comma separated)',notes:'Note',project:'Project',lot:'Apartment',none:'Not specified',all:'No specific apartment'},
  ar:{title:'بيانات جهة الاتصال',name:'الاسم واللقب',phone:'الهاتف',email:'البريد الإلكتروني',city:'المدينة',source:'المصدر',tags:'الوسوم (مفصولة بفواصل)',notes:'ملاحظة',project:'المشروع',lot:'الشقة',none:'غير محدد',all:'لا توجد شقة محددة'},
};
export default function ContactEditor({contact,projects,locale,sources}: {contact?:Contact;projects:{slug:string;name:string;lots:{ref:string;code:string}[]}[];locale:Locale;sources:Record<string,string>}) {
  const [slug,setSlug]=useState(contact?.projectSlug??'');const [lot,setLot]=useState(contact?.lotRef??'');const c=copy[locale];
  return <AdminForm operation="contact-save" title={c.title}>
    {contact && <input type="hidden" name="contact" value={contact.id}/>}
    {contact?.budget && <input type="hidden" name="budget" value={contact.budget}/>}
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {[['name',c.name,contact?.name,'text'],['phone',c.phone,contact?.phone,'tel'],['email',c.email,contact?.email,'email'],['city',c.city,contact?.city,'text']].map(([name,label,value,type])=><label key={name} className="block text-sm">{label}<input className="field mt-2" name={name} type={type} defaultValue={value} required={name==='name'||name==='phone'} maxLength={name==='name'?200:name==='phone'?80:name==='email'?254:160}/></label>)}
      <label className="block text-sm">{c.source}<select className="field mt-2" name="source" defaultValue={contact?.source??'website'}>{Object.entries(sources).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label className="block text-sm">{c.tags}<input className="field mt-2" name="tags" maxLength={1000} defaultValue={contact?.tags.join(', ')} placeholder="S+3, La Gloire"/></label>
      <label className="block text-sm">{c.project}<select className="field mt-2" name="project" value={slug} onChange={event=>{setSlug(event.target.value);setLot('');}}><option value="">{c.none}</option>{projects.map(project=><option key={project.slug} value={project.slug}>{project.name}</option>)}</select></label>
      <label className="block text-sm">{c.lot}<select className="field mt-2" name="lot" value={lot} onChange={event=>setLot(event.target.value)} disabled={!slug}><option value="">{c.all}</option>{projects.find(project=>project.slug===slug)?.lots.map(lot=><option key={lot.ref} value={lot.ref}>{lot.code}</option>)}</select></label>
    </div>
    <label className="block text-sm">{c.notes}<textarea className="field mt-2" name="notes" rows={4} maxLength={4000} defaultValue={contact?.notes}/></label>
  </AdminForm>;
}
