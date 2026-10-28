'use server';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { revalidatePath } from 'next/cache';
import { getSession, createSession } from './session';
import { readDb, writeCommercialDb as writeDb, isPersistent } from './db';
import type { Database, Localized, User } from './types';
import { projectPresentation } from './project-presentation';
import { parseContactInput } from './contact-input';
import { galleryPhotoCategory, parseGalleryFilters, projectGalleryFilters } from './gallery-filters';
import { allowRequest } from './rate-limit';
import { deleteClientDossier } from './client-deletion';
import { deleteCrmRow } from './crm-deletion';
import { validateContractPdf } from './pdf-validation';
import { withAudit } from './audit';
import { verifyAdminPassword } from './sensitive-actions';
import { attachClientLot, changeLotStatus, lotClient } from './lot-commercial';
import { clientProperties, clientPaymentsForProperty, setClientProperties } from './client-properties';
import { parseCustomAmenities, selectedAmenities } from './amenities';
import { parseConstructionSteps } from './construction-progress';
import { applyPaymentOperation } from './commercial-payments';
import { formValue as value, requiredText as text, propertyTarget as target } from './commercial-input';

export type PaymentSnapshot = {clientId:string; payments:NonNullable<User['payments']>; paymentSchedules:NonNullable<User['paymentSchedules']>};
export type CommercialState = { ok: boolean; message: string; publicPath?: string; paymentSnapshot?:PaymentSnapshot };
const localize = (s: string): Localized => ({ fr:s, en:s, ar:s });
function percentValue(raw: string) { const n=Number(raw); if (!raw || !Number.isInteger(n) || n<0 || n>100) throw new Error('L’avancement doit être un entier compris entre 0 et 100.'); return n; }
function percent(form: FormData) { return percentValue(value(form,'progress')); }
function translated(form: FormData, prefix: string, max = 200): Localized {
  return { fr:text(form,`${prefix}Fr`,max), en:text(form,`${prefix}En`,max), ar:text(form,`${prefix}Ar`,max) };
}
function optionalTranslated(form: FormData, prefix: string, max = 200): Localized | undefined {
  const values={fr:value(form,`${prefix}Fr`),en:value(form,`${prefix}En`),ar:value(form,`${prefix}Ar`)};
  if(!values.fr && !values.en && !values.ar) return undefined;
  if(Object.values(values).some(item=>!item || item.length>max)) throw new Error(`Renseignez ${prefix} dans les trois langues.`);
  return values;
}
function lines(form: FormData, key: string, maxLines = 20): string[] {
  const raw=value(form,key);
  if(raw.length>6000) throw new Error(`${key} est trop long.`);
  const result=raw.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  if(result.length>maxLines || result.some(line=>line.length>240)) throw new Error(`${key} dépasse la limite autorisée.`);
  return result;
}
function galleryPosition(form: FormData, maximum: number): number {
  const raw=value(form,'position');
  const number=Number(raw);
  if(!raw || !Number.isInteger(number) || number<1 || number>maximum) throw new Error(`La position doit être comprise entre 1 et ${maximum}.`);
  return number-1;
}
function galleryCategory(form: FormData, project: Database['projects'][number]) {
  const category=value(form,'category');
  if(category && !projectGalleryFilters(project).some(filter=>filter.id===category)) throw new Error('Emplacement de galerie invalide.');
  return category || 'general';
}
async function staff() {
  const session=await getSession();
  const db=(await readDb());
  if (!session || db.users.find(u=>u.id===session.sub)?.role!=='admin') throw new Error('Accès commercial requis.');
  if (!isPersistent()) throw new Error('Un stockage durable doit être configuré avant de modifier les dossiers sur cet hébergement.');
}

type SelectedLot = { projectSlug: string; lotRef: string; status: string; reservationNote?: string };
function selectedClientLots(form: FormData): SelectedLot[] {
  const raw=value(form,'properties');
  if (!raw) return [{projectSlug:value(form,'project'),lotRef:value(form,'lot'),status:value(form,'status'),reservationNote:value(form,'reservationNote')}];
  if(raw.length>250000) throw new Error('Sélection d’appartements trop longue.');
  let entries: unknown;
  try { entries=JSON.parse(raw); } catch { throw new Error('Sélection d’appartements invalide.'); }
  if(!Array.isArray(entries) || !entries.length || entries.length>100) throw new Error('Sélectionnez entre 1 et 100 appartements.');
  const seen=new Set<string>();
  return entries.map(item=>{
    if(!item || typeof item!=='object' || typeof item.projectSlug!=='string' || typeof item.lotRef!=='string' || !['reserved','sold'].includes(item.status) || (item.reservationNote!==undefined && typeof item.reservationNote!=='string')) throw new Error('Sélection d’appartements invalide.');
    const key=JSON.stringify([item.projectSlug,item.lotRef]);
    if(seen.has(key)) throw new Error('Un appartement est sélectionné plusieurs fois.');
    seen.add(key); return item as SelectedLot;
  });
}
async function createClient(db: Database, form: FormData, selected=selectedClientLots(form), authorized=false): Promise<User> {
  const email=text(form,'email').toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Adresse e-mail invalide.');
  if(db.users.some(user=>user.email.toLowerCase()===email)) throw new Error('Cette adresse possède déjà un compte.');
  const password=String(form.get('password')??'');
  if(password.length<12 || Buffer.byteLength(password)>72) throw new Error('Mot de passe : au moins 12 caractères et au maximum 72 octets.');
  const phone=value(form,'phone');
  if(phone.length>80) throw new Error('Téléphone trop long.');
  const client: User={id:randomUUID(),name:text(form,'name'),email,phone,passwordHash:await bcrypt.hash(password,12),role:'client',properties:[],documents:[],messages:[],payments:[]};
  db.users.push(client);
  for(const item of selected) {
    const project=db.projects.find(project=>project.slug===item.projectSlug);
    const lot=project?.lots.find(lot=>lot.ref===item.lotRef);
    if(!project || !lot) throw new Error('Appartement introuvable.');
    if(!['reserved','sold'].includes(item.status)) throw new Error('Choisissez réservé ou vendu pour chaque appartement.');
    if(lotClient(db,project.slug,lot.ref)) throw new Error('Cet appartement possède déjà un compte client.');
    attachClientLot(db,client,project.slug,lot.ref);
    changeLotStatus(db,project.slug,lot,item.status,authorized,item.reservationNote);
  }
  return client;
}
async function applyLotForm(db: Database, form: FormData, authorized=false) {
  const {project,lot}=target(db,form);
  if(!lot) throw new Error('Sélectionnez un appartement.');
  const status=value(form,'status');
  if(!['available','reserved','sold','unconfirmed'].includes(status)) throw new Error('Statut invalide.');
  const owner=lotClient(db,project.slug,lot.ref);
  const clientId=value(form,'client');
  if(owner && clientId && owner.id!==clientId) throw new Error('Cet appartement possède déjà un autre compte client.');
  if(status==='sold' && !owner) {
    if(value(form,'clientMode')==='new') await createClient(db,form,[{projectSlug:project.slug,lotRef:lot.ref,status:'sold'}],authorized);
    else {
      const client=db.users.find(user=>user.id===clientId && user.role==='client');
      if(!client) throw new Error('Créez ou sélectionnez un compte client pour la vente.');
      attachClientLot(db,client,project.slug,lot.ref);
    }
  }
  changeLotStatus(db,project.slug,lot,status,authorized,form.has('reservationNote')?value(form,'reservationNote'):undefined);
  return {project,lot};
}
export async function commercialAction(_: CommercialState, form: FormData): Promise<CommercialState> {

  try {
    await staff();
    const operation=value(form,'operation');
    let publicPath: string | undefined;
    let paymentSnapshot: PaymentSnapshot | undefined;
    const actor=await getSession();
    return await withAudit({actorId:actor!.sub,operation},async()=>{
    if(!await allowRequest(`commercial-${operation}`,actor!.sub,operation==='client-delete'?5:operation.startsWith('password-')?10:60,60000)) throw new Error('Trop de demandes. Réessayez dans une minute.');
    const authorized=form.has('sensitivePassword') ? await verifyAdminPassword((await readDb()),actor!.sub,String(form.get('sensitivePassword')??'')) : false;
    if(operation==='password-self' || operation==='password-client') {
      const session=await getSession();
      const operator=(await readDb()).users.find(u=>u.id===session?.sub && u.role==='admin');
      const current=String(form.get('currentPassword')??'');
      if(!operator) throw new Error('Accès commercial requis.');
      if(operation==='password-self' && !await bcrypt.compare(current,operator.passwordHash)) throw new Error('Votre mot de passe actuel est incorrect.');
      const password=String(form.get('password')??'');
      if(password.length<12 || Buffer.byteLength(password)>72) throw new Error('Mot de passe : au moins 12 caractères et au maximum 72 octets.');
      if(password!==String(form.get('confirmation')??'')) throw new Error('Les deux nouveaux mots de passe ne correspondent pas.');
      const passwordHash=await bcrypt.hash(password,12);
      await staff();
      const db=(await readDb());
      if(db.users.find(u=>u.id===operator.id)?.passwordHash!==operator.passwordHash) throw new Error('Votre compte a changé. Reconnectez-vous.');
      const user=operation==='password-self'?db.users.find(u=>u.id===operator.id):db.users.find(u=>u.id===value(form,'client') && u.role==='client');
      if(!user) throw new Error('Compte client introuvable.');
      user.passwordHash=passwordHash; user.authVersion=(user.authVersion??0)+1;
      (await writeDb(db));
      if(operation==='password-self') await createSession({sub:user.id,email:user.email,name:user.name,role:user.role});
    } else if (operation==='client') {
      const db=await readDb();
      await createClient(db,form,selectedClientLots(form),authorized);
      await writeDb(db);
    } else if(operation==='upload') {
      const file=form.get('file');
      const kind=value(form,'kind');
      const inputLimit=kind==='panorama'||kind==='gallery'?8*1024*1024:3*1024*1024;
      if (!(file instanceof File) || !file.size || file.size>inputLimit) throw new Error(`Sélectionnez un fichier de moins de ${Math.round(inputLimit/1048576)} Mo.`);
      const label=text(form,'label');
      const caption: Localized = {fr:label,en:value(form,'labelEn')||label,ar:value(form,'labelAr')||label};
      if(caption.en.length>200 || caption.ar.length>200) throw new Error('Titre de photo trop long.');
      if(!['contract','gallery','construction','panorama'].includes(kind)) throw new Error('Type de publication invalide.');
      let bytes=Buffer.from(await file.arrayBuffer()); let mime='application/pdf';
      if(kind==='contract') { await validateContractPdf(bytes); }
      else {
        const metadata=await sharp(bytes,{limitInputPixels:40000000}).metadata();
        if(!['jpeg','png','webp'].includes(metadata.format??'')) throw new Error('Formats photo acceptés : JPEG, PNG et WebP.');
        if(kind==='panorama') {
          const rotated=[5,6,7,8].includes(metadata.orientation??1);
          const width=rotated?metadata.height:metadata.width;
          const height=rotated?metadata.width:metadata.height;
          if(!width||!height||width<1600||height<800||Math.abs(width-2*height)>2)
            throw new Error('La visite 360° exige une image équirectangulaire 2:1 de 1 600 × 800 pixels minimum. Une photo ordinaire ne peut pas être transformée en vrai panorama.');
          bytes=await sharp(bytes,{limitInputPixels:40000000}).rotate().resize({width:4096,withoutEnlargement:true}).webp({quality:82,effort:4}).toBuffer();
        } else {
          bytes=await sharp(bytes,{limitInputPixels:40000000}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer();
        }
        mime='image/webp';
      }
      if(bytes.length>3*1024*1024) throw new Error('Le fichier optimisé dépasse 3 Mo. Réduisez sa résolution.');
      const db=(await readDb()); const id=randomUUID(); const href=`/api/media/${id}`;
      const recipient=kind==='contract'||kind==='construction' ? db.users.find(u=>u.id===value(form,'client') && u.role==='client') : undefined;
      if((kind==='contract'||kind==='construction') && !recipient) throw new Error('Sélectionnez un client destinataire.');
      if(recipient) {
        const properties=clientProperties(recipient);
        const propertyIndex=value(form,kind==='contract'?'contractProperty':'constructionProperty');
        const general=kind==='construction' && propertyIndex==='all';
        const index=propertyIndex ? Number(propertyIndex) : 0;
        if(kind==='construction' && !propertyIndex) throw new Error('Choisissez un appartement ou le dossier général du client.');
        if(!general && (!Number.isInteger(index) || index<0 || (propertyIndex && index>=properties.length))) throw new Error('Appartement du destinataire invalide.');
        const property=general ? undefined : properties[index];
        if(kind==='construction' && property && !db.projects.find(project=>project.slug===property.projectSlug)?.lots.some(lot=>lot.ref===property.lotRef)) throw new Error('Cet appartement n’est plus disponible dans le dossier. Rechargez la page.');
        if(kind==='contract') {
          (recipient.documents??=[]).push({id,label:localize(label),kind:'contract',date:new Date().toISOString(),href,...property});
          (recipient.messages??=[]).push({id:randomUUID(),from:'imf',date:new Date().toISOString(),body:`Un document est disponible dans votre espace Documents : ${label}`});
        } else (recipient.constructionPhotos??=[]).push({src:href,caption,...property});
      } else {
        const {project,lot}=target(db,form); const dest=lot??project; const photo={src:href,caption};
        if(kind==='panorama') {
          if(!lot) throw new Error('Sélectionnez un appartement pour le panorama.');
          const roomId=value(form,'room');
          if(roomId==='new') {
            (lot.rooms??=[]).push({id:`custom-${randomUUID().slice(0,8)}`,label:{fr:text(form,'roomFr'),en:text(form,'roomEn'),ar:text(form,'roomAr')},panorama:href});
          } else {
            const room=lot.rooms?.find(candidate=>candidate.id===roomId);
            if(!room) throw new Error('Sélectionnez une pièce existante ou créez-en une nouvelle.');
            room.panorama=href;
          }
          publicPath=`/projets/${project.slug}/appartements/${lot.ref}#visite-360`;
        } else if(kind==='gallery') {
          if(!lot && !project.galleryEdited) project.gallery=projectPresentation(project).gallery;
          const gallery=dest.gallery??=[];
          const position=value(form,'position') ? galleryPosition(form,gallery.length+1) : gallery.length;
          gallery.splice(position,0,{...photo,...(!lot ? {category:galleryCategory(form,project)} : {})});
          if(!lot) project.galleryEdited=true;
          publicPath=`/projets/${project.slug}${lot?`/appartements/${lot.ref}#galerie`:'#galerie'}`;
        }
      }

      (db.uploads??=[]).push({id,mime,name:label+(kind==='contract'?'.pdf':'.webp'),clientId:recipient?.id,public:kind==='gallery'||kind==='panorama'});
      await writeDb(db,{id,bytes});
    } else {
      const db=(await readDb());
      if(operation==='contact-save') {
        const input=parseContactInput(form,db.projects);
        const id=value(form,'contact');
        if(id) {
          const contact=db.contacts.find(contact=>contact.id===id);
          if(!contact) throw new Error('Contact introuvable.');
          Object.assign(contact,input);
        } else db.contacts.unshift({...input,id:randomUUID(),createdAt:new Date().toISOString().slice(0,10)});
      } else if(operation==='task-delete' || operation==='contact-delete' || operation==='deal-delete') {
        if(value(form,'confirm')!=='yes') throw new Error('Confirmez la suppression de cette ligne.');
        const kind = operation === 'task-delete' ? 'task' : operation === 'contact-delete' ? 'contact' : 'deal';
        deleteCrmRow(db,kind,value(form,kind));
      } else if(operation==='client-delete') {
        if(value(form,'confirm')!=='yes') throw new Error('Confirmez la suppression définitive du dossier client.');
        if(!authorized) throw new Error('Mot de passe administrateur requis ou incorrect.');
        deleteClientDossier(db,value(form,'client'));
      } else if(operation==='client-edit') {
        const client=db.users.find(u=>u.id===value(form,'client') && u.role==='client');
        if(!client) throw new Error('Client introuvable.');
        const email=text(form,'email').toLowerCase();
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Adresse e-mail invalide.');
        if(db.users.some(u=>u.id!==client.id && u.email.toLowerCase()===email)) throw new Error('Cette adresse possède déjà un compte.');
        const phone=value(form,'phone'); if(phone.length>80) throw new Error('Téléphone trop long.');
        Object.assign(client,{name:text(form,'name'),email,phone});
      } else if(operation==='client-property-add' || operation==='client-property-remove' || operation==='client-property-primary') {
        const client=db.users.find(u=>u.id===value(form,'client') && u.role==='client');
        if(!client) throw new Error('Client introuvable.');
        const {project,lot}=target(db,form);
        if(!lot) throw new Error('Sélectionnez un appartement.');
        const current=clientProperties(client);
        const exists=current.some(item=>item.projectSlug===project.slug && item.lotRef===lot.ref);
        if(operation==='client-property-add') {
          if(exists) throw new Error('Cet appartement est déjà lié au client.');
          if(db.users.some(u=>u.id!==client.id && u.role==='client' && clientProperties(u).some(item=>item.projectSlug===project.slug && item.lotRef===lot.ref))) throw new Error('Cet appartement possède déjà un autre compte client.');
          const status=value(form,'status');
          if(!['reserved','sold'].includes(status)) throw new Error('Statut de vente invalide.');
          attachClientLot(db,client,project.slug,lot.ref);
          changeLotStatus(db,project.slug,lot,status,authorized,value(form,'reservationNote'));
          publicPath=`/projets/${project.slug}/appartements/${lot.ref}`;
        } else {
          if(!exists) throw new Error('Cet appartement n’est pas lié au client.');
          if(operation==='client-property-remove') {
            if(value(form,'confirm')!=='yes') throw new Error('Confirmez le retrait de cet appartement.');
            setClientProperties(client,current.filter(item=>item.projectSlug!==project.slug || item.lotRef!==lot.ref));
          } else setClientProperties(client,[{projectSlug:project.slug,lotRef:lot.ref},...current.filter(item=>item.projectSlug!==project.slug || item.lotRef!==lot.ref)]);
        }
      } else if(operation==='message-edit') {
        const client=db.users.find(u=>u.id===value(form,'client') && u.role==='client');
        const message=client?.messages?.find(m=>m.id===value(form,'message') && m.from==='imf');
        if(!message) throw new Error('Message envoyé introuvable.');
        message.body=text(form,'body',4000);
      } else if(operation==='document-remove' || operation==='document-restore') {
        const client=db.users.find(u=>u.id===value(form,'client') && u.role==='client');
        if(!client) throw new Error('Client introuvable.');
        const restoring=operation==='document-restore';
        const source=restoring?(client.archivedDocuments??=[]):(client.documents??=[]);
        const index=source.findIndex(d=>d.id===value(form,'document'));
        if(index<0) throw new Error('Document introuvable pour ce client.');
        const [document]=source.splice(index,1);
        (restoring?(client.documents??=[]):(client.archivedDocuments??=[])).push(document);
      } else if(operation.startsWith('payment-')) {
        applyPaymentOperation(db,form);
      } else if(operation==='lot-status') {
        const {project,lot}=await applyLotForm(db,form,authorized);
        publicPath=`/projets/${project.slug}/appartements/${lot.ref}`;
      } else if(operation==='property') {
        const {project,lot}=target(db,form); (lot??project).progressPercent=percent(form);
        if(lot && form.has('status')) await applyLotForm(db,form,authorized);
        else if(!lot && form.has('progressSteps')) project.progress=parseConstructionSteps(value(form,'progressSteps'));
        else if(!lot && project.progress?.length && form.has('step-0')) project.progress=project.progress.map((step,index)=>{
          const next=percentValue(value(form,`step-${index}`));
          return {...step,percent:next,done:next===100};
        });
        publicPath=`/projets/${project.slug}${lot?`/appartements/${lot.ref}`:'#avancement'}`;
      } else if(operation==='project-content') {
        const {project,lot}=target(db,form);
        if(lot) throw new Error('Sélectionnez une résidence.');
        project.name=text(form,'name',120);
        project.progressPercent=value(form,'progress') ? percent(form) : undefined;
        project.presentationLabels={
          overview:translated(form,'sectionOverview',120),
          highlights:translated(form,'sectionHighlights',120),
          specs:translated(form,'sectionSpecs',120),
          amenities:translated(form,'sectionAmenities',120),
          progress:translated(form,'sectionProgress',120),
          gallery:translated(form,'sectionGallery',120),
        };
        project.subtitle=translated(form,'subtitle',240);
        project.address=translated(form,'address',240);
        project.description=translated(form,'description',3000);
        project.deliveryLabel=optionalTranslated(form,'delivery',160);
        const highlights={fr:lines(form,'highlightsFr'),en:lines(form,'highlightsEn'),ar:lines(form,'highlightsAr')};
        if(highlights.fr.length!==highlights.en.length || highlights.fr.length!==highlights.ar.length) throw new Error('Les points forts doivent avoir le même nombre de lignes dans les trois langues.');
        project.highlights=highlights.fr.map((fr,index)=>({fr,en:highlights.en[index],ar:highlights.ar[index]}));
        project.specs=project.specs.map((_,index)=>({label:translated(form,`specLabel${index}`,120),value:translated(form,`specValue${index}`,240)}));
        project.progress=form.has('progressSteps') ? parseConstructionSteps(value(form,'progressSteps')) : project.progress?.map((step,index)=>({label:translated(form,`progressLabel${index}`,120),percent:percentValue(value(form,`step-${index}`)),done:value(form,`step-${index}`)==='100'}));
        project.customAmenities=form.has('customAmenities') ? parseCustomAmenities(value(form,'customAmenities')) : project.customAmenities??[];
        project.amenities=selectedAmenities(form.getAll('amenities').map(String),project.customAmenities);
        project.presentationEdited=true;
        publicPath=`/projets/${project.slug}#programme`;
      } else if(operation==='gallery-filters') {
        const {project,lot}=target(db,form);
        if(lot) throw new Error('Sélectionnez une résidence.');
        const filters=parseGalleryFilters(value(form,'galleryFilters'));
        const previous=projectGalleryFilters(project);
        project.gallery=projectPresentation(project).gallery.map(photo=>({...photo,category:filters.some(filter=>filter.id===galleryPhotoCategory(photo,previous))?galleryPhotoCategory(photo,previous):'general'}));
        project.galleryFilters=filters;project.galleryEdited=true;
        publicPath=`/projets/${project.slug}#galerie`;
      } else if(operation==='gallery-edit' || operation==='gallery-remove') {
        const {project,lot}=target(db,form);
        if(lot) throw new Error('Sélectionnez une résidence.');
        if(!project.galleryEdited) project.gallery=projectPresentation(project).gallery;
        const index=project.gallery.findIndex(item=>item.src===value(form,'photo'));
        if(index<0) throw new Error('Photo introuvable dans cette résidence. Rechargez la page.');
        if(operation==='gallery-remove') {
          if(value(form,'confirm')!=='yes') throw new Error('Confirmez le retrait de cette photo.');
          const [removed]=project.gallery.splice(index,1);
          const mediaId=/^\/api\/media\/([a-f0-9-]{36})$/.exec(removed.src)?.[1];
          if(mediaId && !db.projects.some(item=>item.gallery.some(photo=>photo.src===removed.src) || item.lots.some(apartment=>apartment.gallery?.some(photo=>photo.src===removed.src)))) {
            const upload=db.uploads?.find(file=>file.id===mediaId);
            if(upload) upload.public=false;
          }
        }
        else {
          const [photo]=project.gallery.splice(index,1);
          photo.caption=translated(form,'caption',200);
          photo.category=galleryCategory(form,project);
          project.gallery.splice(galleryPosition(form,project.gallery.length+1),0,photo);
        }
        project.galleryEdited=true;
        publicPath=`/projets/${project.slug}#galerie`;
      } else if(operation==='company') {
        const email=text(form,'email'); if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Adresse e-mail invalide.');
        db.company={legalName:text(form,'name'),email,phone:text(form,'phone'),address:text(form,'address'),city:text(form,'city'),about:text(form,'about',2000)};
        publicPath='/';
      } else if(operation==='message') {
        const client=db.users.find(u=>u.id===value(form,'client') && u.role==='client'); if(!client) throw new Error('Client introuvable.');
        (client.messages??=[]).push({id:randomUUID(),date:new Date().toISOString(),from:'imf',body:text(form,'body',4000)});
      } else throw new Error('Opération inconnue.');
      (await writeDb(db));
      if(operation.startsWith('payment-')) {
        const client=db.users.find(client=>client.id===value(form,'client') && client.role==='client');
        if(client) paymentSnapshot={clientId:client.id,payments:client.payments??[],paymentSchedules:client.paymentSchedules??[]};
      }
    }
    revalidatePath('/','layout');
    return {ok:true,publicPath,paymentSnapshot,message:operation==='client-delete'?'Compte client et dossier supprimés définitivement.':operation.endsWith('-delete')?'Suppression effectuée.':operation==='client'?'Compte créé. Communiquez les identifiants au client par votre canal habituel.':operation==='upload' && publicPath?.endsWith('#visite-360')?'Panorama ajouté à la visite 360° de cet appartement.':operation==='upload' && publicPath?'Photo WebP ajoutée à la galerie publique.':operation==='upload'?'Publication enregistrée. Le destinataire peut la consulter dans son espace.':'Modifications enregistrées.'};
    });
  } catch(error) {

    return {ok:false,message:error instanceof Error ? error.message : 'Enregistrement impossible.'};
  }
}
