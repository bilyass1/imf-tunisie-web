'use client';
import { useActionState, useEffect, useState, type ReactNode } from 'react';
import { commercialAction } from '@/lib/commercial-actions';
import PasswordField from '@/components/auth/PasswordField';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { Database, ClientDocument, ClientMessage, ProgressStep, Room } from '@/lib/types';

type Client = {id:string;name:string;email:string;phone?:string;projectSlug?:string;lotRef?:string;documents:ClientDocument[];archivedDocuments:ClientDocument[];messages:ClientMessage[]};

type Property = {slug:string;name:string;progressPercent?:number;progress?:ProgressStep[];lots:{ref:string;code:string;status:string;progressPercent?:number;rooms?:Room[]}[]};
function Form({operation,title,children}: {operation:string;title:string;children:ReactNode}) {
  const [state,action,pending]=useActionState(commercialAction,{ok:false,message:''});
  const router=useRouter();
  const {locale}=useParams<{locale:string}>();
  useEffect(()=>{if(state.ok) router.refresh();},[state,router]);
  return <form action={action} className="space-y-5 rounded-2xl border border-ink/10 bg-white p-4 sm:p-6">
    <h2 className="font-display text-2xl">{title}</h2><input type="hidden" name="operation" value={operation}/>
    {children}<button disabled={pending} className="btn-gold disabled:opacity-50">{pending?'Enregistrement…':operation==='document-remove'?'Supprimer du dossier':operation==='document-restore'?'Restaurer':operation==='upload'?'Publier':operation==='client'?'Créer le compte':'Enregistrer'}</button>
    {state.message && <p role="status" className={state.ok?'text-emerald-700':'text-red-700'}>{state.message}</p>}
    {state.ok && state.publicPath && <Link href={`/${locale}${state.publicPath}`} target="_blank" className="inline-block text-sm font-semibold text-gold-700 underline">Voir la modification sur le site public</Link>}
  </form>;
}
function Field({label,name,type='text',defaultValue,required=true}: {label:string;name:string;type?:string;defaultValue?:string;required?:boolean}) {
  if(type==='password') return <PasswordField label={label} name={name}/>;
  return <label className="block text-sm">{label}<input className="field mt-2" name={name} type={type} defaultValue={defaultValue} required={required} minLength={type==='password'?12:undefined} autoComplete={type==='password'?'new-password':undefined}/></label>;
}
function PropertyPicker({projects,requireLot=false,edit=false,panorama=false,initialProject,initialLot}: {projects:Property[];requireLot?:boolean;edit?:boolean;panorama?:boolean;initialProject?:string;initialLot?:string}) {
  const [slug,setSlug]=useState(initialProject??projects[0]?.slug??''); const [ref,setRef]=useState(initialLot??'');
  const [roomSelection,setRoomSelection]=useState('');
  const project=projects.find(p=>p.slug===slug); const lot=project?.lots.find(l=>l.ref===ref);
  return <>
    <label className="block text-sm">Résidence<select name="project" className="field mt-2" value={slug} onChange={e=>{setSlug(e.target.value);setRef('');}} required>{projects.map(p=><option key={p.slug} value={p.slug}>{p.name}</option>)}</select></label>
    <label className="block text-sm">Appartement<select name="lot" className="field mt-2" required={requireLot} value={ref} onChange={e=>{setRef(e.target.value);setRoomSelection('');}}><option value="">{requireLot?'Sélectionner un appartement':'Toute la résidence'}</option>{project?.lots.map(l=><option key={l.ref} value={l.ref}>{l.code}</option>)}</select></label>
    {edit && <div key={`${slug}/${ref}/${lot?.progressPercent}/${project?.progressPercent}/${lot?.status}`} className="space-y-4">
      <label className="block text-sm">Avancement (%)<input className="field mt-2" type="number" name="progress" min="0" max="100" step="1" required defaultValue={(lot??project)?.progressPercent??0}/></label>
      {lot && <label className="block text-sm">Statut<select className="field mt-2" name="status" defaultValue={lot.status}><option value="available">Disponible</option><option value="reserved">Réservé</option><option value="sold">Vendu</option></select></label>}
      {!lot && !!project?.progress?.length && <div className="space-y-3 border-t border-ink/10 pt-4"><p className="text-sm font-semibold">Étapes du chantier visibles sur la fiche de résidence</p>{project.progress.map((step,index)=><label key={`${slug}/${index}/${step.percent}`} className="block text-sm">{step.label.fr} (%)<input className="field mt-2" type="number" name={`step-${index}`} min="0" max="100" step="1" required defaultValue={step.percent}/></label>)}</div>}
    </div>}
    {panorama && lot && <div className="space-y-3 rounded-xl border border-ink/10 bg-sand/30 p-4"><label className="block text-sm">Pièce de l’appartement<select className="field mt-2" name="room" value={roomSelection} onChange={e=>setRoomSelection(e.target.value)} required><option value="">Sélectionner une pièce</option>{lot.rooms?.map(room=><option key={room.id} value={room.id}>{room.label.fr}</option>)}<option value="new">Ajouter une pièce validée par le plan</option></select></label>{roomSelection==='new' && <div className="grid gap-3 sm:grid-cols-3"><Field label="Nom français" name="roomFr"/><Field label="English name" name="roomEn"/><Field label="الاسم بالعربية" name="roomAr"/></div>}</div>}
  </>;
}
function PasswordChange({clientId}:{clientId?:string}) {
  return <Form operation={clientId?'password-client':'password-self'} title={clientId?'Changer le mot de passe du client':'Changer mon mot de passe'}>
    {clientId && <input type="hidden" name="client" value={clientId}/>}
    {!clientId && <PasswordField label="Votre mot de passe commercial actuel" name="currentPassword" autoComplete="current-password" minLength={1}/>}
    <PasswordField label="Nouveau mot de passe (12 caractères minimum)" name="password"/>
    <PasswordField label="Confirmer le nouveau mot de passe" name="confirmation"/>
    <p className="text-sm text-ink/55">Les autres sessions du compte seront déconnectées. {clientId?'Communiquez le nouveau mot de passe au client par votre canal habituel.':''}</p>
  </Form>;
}
function ClientDossier({client,projects}:{client:Client;projects:Property[]}) {
  return <div className="mt-5 space-y-5">
    <Form operation="client-edit" title="Modifier le compte et les coordonnées">
      <input type="hidden" name="client" value={client.id}/>
      <div key={`${client.id}/${client.name}/${client.email}/${client.phone}`} className="grid gap-5 sm:grid-cols-2"><Field label="Nom complet" name="name" defaultValue={client.name}/><Field label="E-mail de connexion" name="email" type="email" defaultValue={client.email}/><Field label="Téléphone" name="phone" defaultValue={client.phone} required={false}/></div>
      <PropertyPicker key={`${client.projectSlug}/${client.lotRef}`} projects={projects} requireLot initialProject={client.projectSlug} initialLot={client.lotRef}/>
      <p className="text-sm text-ink/55">L’e-mail devient l’identifiant de connexion. Le bien associé détermine les photos de chantier accessibles au client. Son mot de passe et ses documents sont conservés.</p>
    </Form>
    <PasswordChange clientId={client.id}/>
    <h3 className="font-display text-2xl">Messages du dossier</h3>
    {!client.messages.length && <p className="text-sm text-ink/55">Aucun message.</p>}
    {client.messages.map(message=>message.from==='imf'?<Form key={message.id} operation="message-edit" title="Modifier un message envoyé"><input type="hidden" name="client" value={client.id}/><input type="hidden" name="message" value={message.id}/><p className="text-sm text-ink/55">Envoyé le {message.date.slice(0,10)}</p><label className="block text-sm">Message<textarea key={message.body} name="body" required maxLength={4000} rows={4} defaultValue={message.body} className="field mt-2"/></label></Form>:<div key={message.id} className="rounded-xl border border-ink/10 bg-sand/40 p-5"><p className="text-sm text-ink/55">Message du client · {message.date.slice(0,10)}</p><p className="mt-2 whitespace-pre-wrap">{message.body}</p></div>)}
    <h3 className="font-display text-2xl">Documents du client</h3>
    {!client.documents.length && <p className="text-sm text-ink/55">Aucun document actif.</p>}
    {client.documents.map(doc=><Form key={doc.id} operation="document-remove" title={doc.label.fr}><input type="hidden" name="client" value={client.id}/><input type="hidden" name="document" value={doc.id}/><a href={doc.href} target="_blank" rel="noreferrer" className="text-sm underline">Consulter le document</a><label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1"/>Retirer ce document de l’espace client. Il restera récupérable dans la corbeille.</label></Form>)}
    {!!client.archivedDocuments.length && <details className="rounded-xl border border-ink/10 p-5"><summary className="cursor-pointer font-medium">Corbeille · {client.archivedDocuments.length} document(s)</summary><div className="mt-4 space-y-4">{client.archivedDocuments.map(doc=><Form key={doc.id} operation="document-restore" title={doc.label.fr}><input type="hidden" name="client" value={client.id}/><input type="hidden" name="document" value={doc.id}/><p className="text-sm text-ink/55">La restauration rendra ce document de nouveau accessible au client.</p></Form>)}</div></details>}
  </div>;
}
export default function CommercialConsole({projects,clients,company}: {projects:Property[];clients:Client[];company:NonNullable<Database['company']>}) {
  const {locale}=useParams<{locale:string}>();
  const [tab,setTab]=useState('clients'); const [kind,setKind]=useState('contract');
  const recipient=<label className="block text-sm">Client destinataire<select className="field mt-2" name="client" required><option value="">Sélectionner un client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name} · {c.email} · {c.lotRef}</option>)}</select></label>;
  return <>
    <div className="commercial-tabs mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">{[['clients','Comptes clients'],['properties','Résidences et appartements'],['uploads','Contrats et photos'],['messages','Messages clients'],['company','Entreprise'],['account','Mon compte']].map(([key,label])=><button key={key} onClick={()=>setTab(key)} className={tab===key?'btn-gold':'btn-ghost'} aria-pressed={tab===key}>{label}</button>)}</div>
    <div className="max-w-4xl">
    {tab==='clients' && <><Form operation="client" title="Créer un compte client"><div className="grid gap-5 sm:grid-cols-2"><Field label="Nom complet" name="name"/><Field label="E-mail de connexion" name="email" type="email"/><Field label="Téléphone" name="phone" required={false}/><Field label="Mot de passe initial (12 caractères minimum)" name="password" type="password"/></div><PropertyPicker projects={projects} requireLot/><p className="text-sm text-ink/55">Le compte donne accès aux documents, messages et photos du bien associé. Communiquez les identifiants au client après création.</p></Form><div className="mt-6 space-y-3">{clients.map(c=><details key={c.id} className="rounded-xl border border-ink/10 bg-white p-4"><summary className="cursor-pointer"><strong>{c.name}</strong><span className="ms-3 text-sm text-gold-600">Ouvrir / modifier le dossier</span><p className="mt-1 text-sm text-ink/60">{c.email} · {c.lotRef??'Sans appartement'} · {c.documents.length} document(s)</p></summary><ClientDossier client={c} projects={projects}/></details>)}</div></>}
    {tab==='properties' && <Form operation="property" title="Mettre à jour le bien"><PropertyPicker projects={projects} edit/><p className="text-sm text-ink/55">Le statut et l’avancement seront visibles sur le site et dans l’espace du client.</p></Form>}
    {tab==='uploads' && <Form operation="upload" title="Publier un contrat ou des photos"><label className="block text-sm">Destination<select name="kind" value={kind} onChange={e=>setKind(e.target.value)} className="field mt-2"><option value="contract">Contrat PDF · espace privé du client</option><option value="construction">Photo de chantier · espace client</option><option value="gallery">Photo de galerie · site public</option><option value="panorama">Panorama 360° · visite de l’appartement</option></select></label>{kind==='contract'?recipient:<PropertyPicker key={kind} projects={projects} requireLot={kind==='panorama'} panorama={kind==='panorama'}/>}<Field label="Titre / légende" name="label"/><label className="block text-sm">Fichier ({kind==='gallery'||kind==='panorama'?'8':'3'} Mo maximum avant conversion)<input key={kind} type="file" name="file" required onChange={e=>{const input=e.currentTarget;const limit=(kind==='gallery'||kind==='panorama'?8:3)*1024*1024;input.setCustomValidity(input.files?.[0] && input.files[0].size>limit?`Le fichier doit faire moins de ${Math.round(limit/1048576)} Mo.`:'');input.reportValidity();}} accept={kind==='contract'?'application/pdf':'image/jpeg,image/png,image/webp'} className="field mt-2"/></label><p className="text-sm text-ink/55">Les photos de galerie sont converties en WebP avant publication. Le panorama doit être une vraie image équirectangulaire 2:1 (au moins 1 600 × 800 pixels) ; il est converti en WebP sans créer une visite à partir d’une photo ordinaire. Les contrats et photos de chantier restent accessibles selon les droits du client.</p></Form>}
    {tab==='messages' && <div className="rounded-2xl border border-ink/10 bg-white p-4 sm:p-6"><h2 className="font-display text-2xl">Discussions avec les clients</h2><p className="my-4 text-ink/60">Consultez les messages reçus et répondez dans la conversation de chaque client.</p><Link href={`/${locale}/admin/messages`} className="btn-gold">Ouvrir la messagerie</Link></div>}
    {tab==='account' && <PasswordChange/>}
    {tab==='company' && <Form operation="company" title="Informations de l’entreprise"><Field label="Raison sociale" name="name" defaultValue={company.legalName}/><Field label="E-mail" name="email" type="email" defaultValue={company.email}/><Field label="Téléphone commercial" name="phone" defaultValue={company.phone}/><Field label="Adresse" name="address" defaultValue={company.address}/><Field label="Ville / code postal" name="city" defaultValue={company.city}/><label className="block text-sm">Présentation<textarea name="about" required maxLength={2000} rows={5} className="field mt-2" defaultValue={company.about}/></label></Form>}
    </div>
  </>;
}
