'use client';
import { useActionState, useEffect, useState, type ReactNode } from 'react';
import { commercialAction } from '@/lib/commercial-actions';
import PasswordField from '@/components/auth/PasswordField';
import Link from 'next/link';
import Image from 'next/image';
import { AMENITY_ICONS } from '@/components/Icons';
import { clientProperties } from '@/lib/client-properties';
import CommercialPublicPreview, { showCommercialPublicPreview } from '@/components/admin/CommercialPublicPreview';
import { useParams, useRouter } from 'next/navigation';
import type { Database, ClientDocument, ClientMessage, Project, Room } from '@/lib/types';

type Client = {id:string;name:string;email:string;phone?:string;projectSlug?:string;lotRef?:string;properties?:{projectSlug:string;lotRef:string}[];documents:ClientDocument[];archivedDocuments:ClientDocument[];messages:ClientMessage[]};

type Property = Pick<Project,'slug'|'name'|'subtitle'|'address'|'description'|'deliveryLabel'|'highlights'|'specs'|'amenities'|'gallery'|'progress'|'progressPercent'> & {presentationLabels: NonNullable<Project['presentationLabels']>;lots:{ref:string;code:string;status:string;progressPercent?:number;rooms?:Room[]}[]};
function Form({operation,title,children}: {operation:string;title:string;children:ReactNode}) {
  const [state,action,pending]=useActionState(commercialAction,{ok:false,message:''});
  const router=useRouter();
  const {locale}=useParams<{locale:string}>();
  useEffect(()=>{if(state.ok) {router.refresh();if(state.publicPath) showCommercialPublicPreview(state.publicPath,true);}},[state,router]);
  return <form action={action} className="space-y-5 rounded-2xl border border-ink/10 bg-white p-4 sm:p-6">
    <h2 className="font-display text-2xl">{title}</h2><input type="hidden" name="operation" value={operation}/>
    {children}<button disabled={pending} className="btn-gold disabled:opacity-50">{pending?'Enregistrement…':operation==='gallery-remove'?'Retirer la photo':operation==='client-property-add'?'Ajouter cet appartement':operation==='client-property-remove'?'Retirer cet appartement':operation==='client-property-primary'?'Définir comme principal':operation==='document-remove'?'Supprimer du dossier':operation==='document-restore'?'Restaurer':operation==='upload'?'Publier':operation==='client'?'Créer le compte':'Enregistrer'}</button>
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
    <label className="block text-sm">Résidence<select name="project" className="field mt-2" value={slug} onChange={e=>{setSlug(e.target.value);setRef('');showCommercialPublicPreview(`/projets/${e.target.value}`);}} required>{projects.map(p=><option key={p.slug} value={p.slug}>{p.name}</option>)}</select></label>
    <label className="block text-sm">Appartement<select name="lot" className="field mt-2" required={requireLot} value={ref} onChange={e=>{setRef(e.target.value);setRoomSelection('');showCommercialPublicPreview(e.target.value?`/projets/${slug}/appartements/${e.target.value}`:`/projets/${slug}`);}}><option value="">{requireLot?'Sélectionner un appartement':'Toute la résidence'}</option>{project?.lots.map(l=><option key={l.ref} value={l.ref}>{l.code}</option>)}</select></label>
    {edit && <div key={`${slug}/${ref}/${lot?.progressPercent}/${project?.progressPercent}/${lot?.status}`} className="space-y-4">
      <label className="block text-sm">Avancement (%)<input className="field mt-2" type="number" name="progress" min="0" max="100" step="1" required defaultValue={(lot??project)?.progressPercent??0}/></label>
      {lot && <label className="block text-sm">Statut<select className="field mt-2" name="status" defaultValue={lot.status}><option value="available">Disponible</option><option value="reserved">Réservé</option><option value="sold">Vendu</option></select></label>}
      {!lot && !!project?.progress?.length && <div className="space-y-3 border-t border-ink/10 pt-4"><p className="text-sm font-semibold">Étapes du chantier visibles sur la fiche de résidence</p>{project.progress.map((step,index)=><label key={`${slug}/${index}/${step.percent}`} className="block text-sm">{step.label.fr} (%)<input className="field mt-2" type="number" name={`step-${index}`} min="0" max="100" step="1" required defaultValue={step.percent}/></label>)}</div>}
    </div>}
    {panorama && lot && <div className="space-y-3 rounded-xl border border-ink/10 bg-sand/30 p-4"><label className="block text-sm">Pièce de l’appartement<select className="field mt-2" name="room" value={roomSelection} onChange={e=>setRoomSelection(e.target.value)} required><option value="">Sélectionner une pièce</option>{lot.rooms?.map(room=><option key={room.id} value={room.id}>{room.label.fr}</option>)}<option value="new">Ajouter une pièce validée par le plan</option></select></label>{roomSelection==='new' && <div className="grid gap-3 sm:grid-cols-3"><Field label="Nom français" name="roomFr"/><Field label="English name" name="roomEn"/><Field label="الاسم بالعربية" name="roomAr"/></div>}</div>}
  </>;
}
const gallerySections = [
  {value:'',label:'Galerie générale'},
  {value:'perspectives',label:'Perspectives 3D'},
  {value:'works',label:'Chantier et réalisations'},
  {value:'interiors',label:'Intérieurs'},
] as const;
const amenityChoices = [
  ['patio','Patio paysager'],['parking','Parking'],['lift','Ascenseur'],['security','Contrôle d’accès'],
  ['garden','Jardins'],['terrace','Terrasses'],['kitchen','Cuisine équipée'],
  ['aluminium','Menuiserie aluminium'],['heating','Chauffage central'],
] as const;
function TranslatedFields({prefix,label,content,multiline=false,required=true}: {prefix:string;label:string;content:{fr:string;en:string;ar:string};multiline?:boolean;required?:boolean}) {
  return <div className="space-y-2"><p className="text-sm font-semibold">{label}</p><div className="grid gap-3 sm:grid-cols-3">
    {(['fr','en','ar'] as const).map(lang=><label key={lang} className="block text-xs uppercase tracking-wide text-ink/65">{lang==='fr'?'Français':lang==='en'?'English':'العربية'}
      {multiline?<textarea className="field mt-1 min-h-28 normal-case tracking-normal" name={`${prefix}${lang[0].toUpperCase()}${lang.slice(1)}`} defaultValue={content[lang]} rows={5} maxLength={3000} required={required}/>:
        <input className="field mt-1 normal-case tracking-normal" name={`${prefix}${lang[0].toUpperCase()}${lang.slice(1)}`} defaultValue={content[lang]} maxLength={240} required={required}/>}
    </label>)}
  </div></div>;
}
function ProjectContentEditor({projects}: {projects:Property[]}) {
  const [slug,setSlug]=useState(projects[0]?.slug??'');
  const project=projects.find(item=>item.slug===slug);
  if(!project) return null;
  const lines=(language:'fr'|'en'|'ar')=>project.highlights.map(item=>item[language]).join('\n');
  return <div className="space-y-5">
    <label className="block text-sm">Résidence à modifier<select className="field mt-2" value={slug} onChange={event=>{setSlug(event.target.value);showCommercialPublicPreview(`/projets/${event.target.value}`);}}>{projects.map(item=><option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
    <Form key={JSON.stringify([slug,project.name,project.subtitle,project.address,project.description,project.deliveryLabel,project.presentationLabels,project.highlights,project.specs,project.amenities,project.progress,project.progressPercent])} operation="project-content" title="Présentation publique de la résidence">
      <input type="hidden" name="project" value={slug}/>
      <Field label="Nom de la résidence" name="name" defaultValue={project.name}/>
      <label className="block max-w-48 text-sm">Avancement global (%)<input className="field mt-2" type="number" name="progress" min="0" max="100" step="1" defaultValue={project.progressPercent??''} placeholder="Non renseigné"/></label>
      <details className="rounded-xl border border-ink/10 p-4"><summary className="cursor-pointer text-sm font-medium">Titres des rubriques</summary><div className="mt-4 space-y-4"><TranslatedFields prefix="sectionOverview" label="Le programme" content={project.presentationLabels.overview}/><TranslatedFields prefix="sectionHighlights" label="Points forts" content={project.presentationLabels.highlights}/><TranslatedFields prefix="sectionSpecs" label="Fiche technique" content={project.presentationLabels.specs}/><TranslatedFields prefix="sectionAmenities" label="Prestations" content={project.presentationLabels.amenities}/><TranslatedFields prefix="sectionProgress" label="Avancement du chantier" content={project.presentationLabels.progress}/><TranslatedFields prefix="sectionGallery" label="Galerie" content={project.presentationLabels.gallery}/></div></details>
      <TranslatedFields prefix="subtitle" label="Sous-titre" content={project.subtitle}/>
      <TranslatedFields prefix="address" label="Adresse affichée" content={project.address}/>
      <TranslatedFields prefix="description" label="Description du programme" content={project.description} multiline/>
      <TranslatedFields prefix="delivery" label="Livraison annoncée (facultatif)" content={project.deliveryLabel??{fr:'',en:'',ar:''}} required={false}/>
      <div className="space-y-3 border-t border-ink/10 pt-5"><p className="text-sm font-semibold">Points forts — une ligne par point, dans le même ordre pour les trois langues</p><div className="grid gap-3 sm:grid-cols-3">{(['fr','en','ar'] as const).map(lang=><label key={lang} className="block text-sm">{lang.toUpperCase()}<textarea className="field mt-2 min-h-40" name={`highlights${lang[0].toUpperCase()}${lang.slice(1)}`} defaultValue={lines(lang)} rows={7}/></label>)}</div></div>
      <div className="space-y-3 border-t border-ink/10 pt-5"><p className="text-sm font-semibold">Fiche technique</p>{project.specs.map((spec,index)=><details key={`${slug}/${index}`} className="rounded-xl border border-ink/10 p-4"><summary className="cursor-pointer text-sm font-medium">{spec.label.fr} · {spec.value.fr}</summary><div className="mt-4 space-y-4"><TranslatedFields prefix={`specLabel${index}`} label="Libellé" content={spec.label}/><TranslatedFields prefix={`specValue${index}`} label="Valeur" content={spec.value}/></div></details>)}</div>
      {!!project.progress?.length && <div className="space-y-3 border-t border-ink/10 pt-5"><p className="text-sm font-semibold">Avancement du chantier</p>{project.progress.map((step,index)=><details key={`${slug}/progress/${index}`} className="rounded-xl border border-ink/10 p-4" open><summary className="cursor-pointer text-sm font-medium">{step.label.fr}</summary><div className="mt-4 space-y-4"><TranslatedFields prefix={`progressLabel${index}`} label="Étape" content={step.label}/><label className="block max-w-40 text-sm">Pourcentage<input className="field mt-2" type="number" name={`step-${index}`} min="0" max="100" step="1" defaultValue={step.percent} required/></label></div></details>)}</div>}
      <div className="space-y-3 border-t border-ink/10 pt-5"><p className="text-sm font-semibold">Prestations affichées</p><p className="text-sm text-ink/55">Sélectionnez les prestations avec les mêmes pictogrammes que sur la fiche publique.</p><div className="flex flex-wrap gap-2.5">{amenityChoices.map(([code,label])=>{const Icon=AMENITY_ICONS[code];return <label key={code} className="cursor-pointer"><input className="peer sr-only" type="checkbox" name="amenities" value={code} defaultChecked={project.amenities.includes(code)}/><span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-[12.5px] text-ink/65 transition hover:border-gold-500 peer-checked:border-gold-500 peer-checked:bg-gold-50 peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-500">{Icon && <Icon className="h-4 w-4 shrink-0 text-gold-500"/>}{label}</span></label>})}</div></div>
      <p className="text-sm text-ink/55">Les modifications seront publiées pour les trois langues. Vérifiez les chiffres et la date de livraison avant l’enregistrement.</p>
    </Form>
    <div className="rounded-2xl border border-ink/10 bg-white p-4 sm:p-6"><h3 className="font-display text-2xl">Galerie de {project.name}</h3><p className="mt-2 text-sm text-ink/60">Modifiez le titre, la rubrique et la position de chaque photo. La position 1 est la grande photo en tête de galerie.</p>
      <div className="mt-5 space-y-3">{project.gallery.map((photo,index)=><details key={`${slug}/${photo.src}/${index}/${photo.caption.fr}`} className="rounded-xl border border-ink/10 p-3 sm:p-4"><summary className="flex cursor-pointer items-center gap-3 text-sm"><Image src={photo.src} alt="" width={96} height={64} unoptimized className="h-16 w-24 rounded-md object-cover"/><span><strong>{index+1}. {photo.caption.fr}</strong><br/><span className="text-ink/55">{gallerySections.find(section=>section.value===photo.category)?.label??'Galerie générale'}</span></span></summary>
        <div className="mt-4 space-y-4"><Form key={`${slug}/${photo.src}/${index}/${photo.caption.fr}`} operation="gallery-edit" title="Modifier cette photo"><input type="hidden" name="project" value={slug}/><input type="hidden" name="photo" value={photo.src}/><TranslatedFields prefix="caption" label="Titre de la photo" content={photo.caption}/><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">Rubrique<select className="field mt-2" name="category" defaultValue={photo.category??''}>{gallerySections.map(section=><option key={section.value} value={section.value}>{section.label}</option>)}</select></label><label className="block text-sm">Position dans la galerie<input className="field mt-2" type="number" name="position" min="1" max={project.gallery.length} defaultValue={index+1} required/></label></div></Form>
          <Form operation="gallery-remove" title="Retirer de la galerie"><input type="hidden" name="project" value={slug}/><input type="hidden" name="photo" value={photo.src}/><p className="text-sm text-ink/55">La photo disparaîtra de la galerie publique. Le fichier original reste conservé.</p><label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm" value="yes" required className="mt-1"/>Confirmer le retrait de cette photo</label></Form></div>
      </details>)}</div>
    </div>
  </div>;
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
  const properties=clientProperties(client);
  return <div className="mt-5 space-y-5">
    <Form operation="client-edit" title="Modifier le compte et les coordonnées">
      <input type="hidden" name="client" value={client.id}/>
      <div key={`${client.id}/${client.name}/${client.email}/${client.phone}`} className="grid gap-5 sm:grid-cols-2"><Field label="Nom complet" name="name" defaultValue={client.name}/><Field label="E-mail de connexion" name="email" type="email" defaultValue={client.email}/><Field label="Téléphone" name="phone" defaultValue={client.phone} required={false}/></div>
      <p className="text-sm text-ink/55">L’e-mail devient l’identifiant de connexion. Les appartements se gèrent ci-dessous ; le mot de passe et les documents sont conservés.</p>
    </Form>
    <div className="rounded-2xl border border-ink/10 bg-white p-4 sm:p-6"><h3 className="font-display text-2xl">Appartements du client</h3><p className="mt-1 text-sm text-ink/55">Un compte peut regrouper plusieurs appartements dans différentes résidences.</p>
      <ul className="mt-4 space-y-3">{properties.map((item,index)=>{const project=projects.find(p=>p.slug===item.projectSlug);const lot=project?.lots.find(l=>l.ref===item.lotRef);return <li key={`${item.projectSlug}/${item.lotRef}`} className="rounded-xl border border-ink/10 p-4"><strong>{project?.name??item.projectSlug} · {lot?.code??item.lotRef}</strong>{index===0 && <span className="ms-2 text-xs text-gold-600">Bien principal</span>}<div className="mt-3 flex flex-wrap gap-3">{index!==0 && <Form operation="client-property-primary" title="Définir comme bien principal"><input type="hidden" name="client" value={client.id}/><input type="hidden" name="project" value={item.projectSlug}/><input type="hidden" name="lot" value={item.lotRef}/></Form>}<Form operation="client-property-remove" title="Retirer ce bien du compte"><input type="hidden" name="client" value={client.id}/><input type="hidden" name="project" value={item.projectSlug}/><input type="hidden" name="lot" value={item.lotRef}/><label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm" value="yes" required/>Confirmer le retrait</label></Form></div></li>})}</ul>
    </div>
    <Form operation="client-property-add" title="Ajouter un appartement à ce client"><input type="hidden" name="client" value={client.id}/><PropertyPicker projects={projects} requireLot/><label className="block text-sm">Statut public du nouvel appartement<select className="field mt-2" name="status" defaultValue=""><option value="">Conserver le statut actuel</option><option value="reserved">Réservé</option><option value="sold">Vendu</option></select></label><p className="text-sm text-ink/55">L’appartement peut appartenir à une autre résidence. Le client le verra avec son compte actuel.</p></Form>
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
function ContractRecipient({clients,projects}: {clients:Client[];projects:Property[]}) {
  const [clientId,setClientId]=useState('');
  const properties=clientProperties(clients.find(item=>item.id===clientId)??{});
  return <div className="space-y-4"><label className="block text-sm">Client destinataire<select className="field mt-2" name="client" required value={clientId} onChange={event=>setClientId(event.target.value)}><option value="">Sélectionner un client</option>{clients.map(client=><option key={client.id} value={client.id}>{client.name} · {client.email} · {clientProperties(client).length} appartement(s)</option>)}</select></label>
    {properties.length>0 && <label className="block text-sm">Appartement concerné par le contrat<select className="field mt-2" name="contractProperty" required key={clientId}>{properties.map((item,index)=>{const project=projects.find(p=>p.slug===item.projectSlug);const lot=project?.lots.find(l=>l.ref===item.lotRef);return <option key={`${item.projectSlug}/${item.lotRef}`} value={index}>{project?.name??item.projectSlug} · {lot?.code??item.lotRef}</option>})}</select></label>}
  </div>;
}
export default function CommercialConsole({projects,clients,company}: {projects:Property[];clients:Client[];company:NonNullable<Database['company']>}) {
  const {locale}=useParams<{locale:string}>();
  const [tab,setTab]=useState('clients'); const [kind,setKind]=useState('contract');
  const [pane,setPane]=useState<'edit'|'preview'>('edit');
  const hasPublicPreview=tab==='properties'||tab==='company'||(tab==='uploads' && (kind==='gallery'||kind==='panorama'));
  const recipient=<ContractRecipient clients={clients} projects={projects}/>;
  return <>
    <div className="commercial-tabs mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">{[['clients','Comptes clients'],['properties','Résidences et appartements'],['uploads','Contrats et photos'],['messages','Messages clients'],['company','Entreprise'],['account','Mon compte']].map(([key,label])=><button key={key} onClick={()=>setTab(key)} className={tab===key?'btn-gold':'btn-ghost'} aria-pressed={tab===key}>{label}</button>)}</div>
    {hasPublicPreview && <div className="mb-4 grid grid-cols-2 gap-2 2xl:hidden" aria-label="Parties de l’interface"><button type="button" className={pane==='edit'?'btn-gold':'btn-ghost'} aria-pressed={pane==='edit'} onClick={()=>setPane('edit')}>Modifications</button><button type="button" className={pane==='preview'?'btn-gold':'btn-ghost'} aria-pressed={pane==='preview'} onClick={()=>setPane('preview')}>Aperçu en direct</button></div>}
    <div className={hasPublicPreview?'grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] 2xl:items-start':'max-w-4xl'}>
    <div className={`min-w-0 ${hasPublicPreview && pane==='preview'?'hidden 2xl:block':''}`}>
    {hasPublicPreview && <h2 className="mb-4 font-display text-2xl">Modifications du site public</h2>}
    {tab==='clients' && <><Form operation="client" title="Créer un compte client"><div className="grid gap-5 sm:grid-cols-2"><Field label="Nom complet" name="name"/><Field label="E-mail de connexion" name="email" type="email"/><Field label="Téléphone" name="phone" required={false}/><Field label="Mot de passe initial (12 caractères minimum)" name="password" type="password"/></div><PropertyPicker projects={projects} requireLot/><p className="text-sm text-ink/55">Après création, vous pourrez ajouter d’autres appartements, même dans une autre résidence. Communiquez les identifiants au client par votre canal habituel.</p></Form><div className="mt-6 space-y-3">{clients.map(c=><details key={c.id} className="rounded-xl border border-ink/10 bg-white p-4"><summary className="cursor-pointer"><strong>{c.name}</strong><span className="ms-3 text-sm text-gold-600">Ouvrir / modifier le dossier</span><p className="mt-1 text-sm text-ink/60">{c.email} · {clientProperties(c).map(item=>item.lotRef).join(' · ')||'Sans appartement'} · {c.documents.length} document(s)</p></summary><ClientDossier client={c} projects={projects}/></details>)}</div></>}
    {tab==='properties' && <div className="space-y-6"><Form operation="property" title="Disponibilité et avancement d’un bien"><PropertyPicker projects={projects} edit/><p className="text-sm text-ink/55">Le statut et l’avancement seront visibles sur le site et dans l’espace du client.</p></Form><ProjectContentEditor projects={projects}/></div>}
    {tab==='uploads' && <Form operation="upload" title="Publier un contrat ou des photos"><label className="block text-sm">Destination<select name="kind" value={kind} onChange={e=>setKind(e.target.value)} className="field mt-2"><option value="contract">Contrat PDF · espace privé du client</option><option value="construction">Photo de chantier · espace client</option><option value="gallery">Photo de galerie · site public</option><option value="panorama">Panorama 360° · visite de l’appartement</option></select></label>{kind==='contract'?recipient:<PropertyPicker key={kind} projects={projects} requireLot={kind==='panorama'} panorama={kind==='panorama'}/>}<Field label="Titre / légende en français" name="label"/>{kind==='gallery' && <><div className="grid gap-3 sm:grid-cols-2"><Field label="Titre en anglais (facultatif)" name="labelEn" required={false}/><Field label="Titre en arabe (facultatif)" name="labelAr" required={false}/></div><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">Rubrique de la galerie<select className="field mt-2" name="category">{gallerySections.map(section=><option key={section.value} value={section.value}>{section.label}</option>)}</select></label><label className="block text-sm">Position dans la galerie (facultatif)<input className="field mt-2" name="position" type="number" min="1" placeholder="Vide = à la fin"/></label></div></>}<label className="block text-sm">Fichier ({kind==='gallery'||kind==='panorama'?'8':'3'} Mo maximum avant conversion)<input key={kind} type="file" name="file" required onChange={e=>{const input=e.currentTarget;const limit=(kind==='gallery'||kind==='panorama'?8:3)*1024*1024;input.setCustomValidity(input.files?.[0] && input.files[0].size>limit?`Le fichier doit faire moins de ${Math.round(limit/1048576)} Mo.`:'');input.reportValidity();}} accept={kind==='contract'?'application/pdf':'image/jpeg,image/png,image/webp'} className="field mt-2"/></label><p className="text-sm text-ink/55">Les photos de galerie sont converties en WebP avant publication. Le panorama doit être une vraie image équirectangulaire 2:1 (au moins 1 600 × 800 pixels) ; il est converti en WebP sans créer une visite à partir d’une photo ordinaire. Les contrats et photos de chantier restent accessibles selon les droits du client.</p></Form>}
    {tab==='messages' && <div className="rounded-2xl border border-ink/10 bg-white p-4 sm:p-6"><h2 className="font-display text-2xl">Discussions avec les clients</h2><p className="my-4 text-ink/60">Consultez les messages reçus et répondez dans la conversation de chaque client.</p><Link href={`/${locale}/admin/messages`} className="btn-gold">Ouvrir la messagerie</Link></div>}
    {tab==='account' && <PasswordChange/>}
    {tab==='company' && <Form operation="company" title="Informations de l’entreprise"><Field label="Raison sociale" name="name" defaultValue={company.legalName}/><Field label="E-mail" name="email" type="email" defaultValue={company.email}/><Field label="Téléphone commercial" name="phone" defaultValue={company.phone}/><Field label="Adresse" name="address" defaultValue={company.address}/><Field label="Ville / code postal" name="city" defaultValue={company.city}/><label className="block text-sm">Présentation<textarea name="about" required maxLength={2000} rows={5} className="field mt-2" defaultValue={company.about}/></label></Form>}
    </div>
    {hasPublicPreview && <div className={`min-w-0 2xl:sticky 2xl:top-5 ${pane==='edit'?'hidden 2xl:block':''}`}><CommercialPublicPreview key={tab} projects={projects} initialPath={tab==='company'?'/':undefined}/></div>}
    </div>
  </>;
}
