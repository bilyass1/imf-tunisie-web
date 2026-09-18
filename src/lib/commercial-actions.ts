'use server';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { revalidatePath } from 'next/cache';
import { getSession, createSession } from './session';
import { readDb, writeCommercialDb as writeDb, isPersistent } from './db';
import type { Database, Localized } from './types';
import { allowRequest } from './rate-limit';

export type CommercialState = { ok: boolean; message: string };
const localize = (s: string): Localized => ({ fr:s, en:s, ar:s });
const value = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
function text(form: FormData, key: string, max = 200) { const s=value(form,key); if (!s || s.length>max) throw new Error(`Champ ${key} manquant ou trop long.`); return s; }
function percent(form: FormData) { const raw=value(form,'progress'); const n=Number(raw); if (!raw || !Number.isFinite(n) || n<0 || n>100) throw new Error('L’avancement doit être compris entre 0 et 100.'); return n; }
async function staff() {
  const session=await getSession();
  const db=readDb();
  if (!session || db.users.find(u=>u.id===session.sub)?.role!=='admin') throw new Error('Accès commercial requis.');
  if (process.env.VERCEL || !isPersistent()) throw new Error('Un stockage durable doit être configuré avant de modifier les dossiers sur cet hébergement.');
}
function target(db: Database, form: FormData) {
  const project=db.projects.find(p=>p.slug===value(form,'project'));
  if (!project) throw new Error('Résidence introuvable.');
  const ref=value(form,'lot'); const lot=ref ? project.lots.find(l=>l.ref===ref) : undefined;
  if (ref && !lot) throw new Error('Appartement introuvable.');
  return {project,lot};
}
export async function commercialAction(_: CommercialState, form: FormData): Promise<CommercialState> {
  let savedFile: string | undefined;
  try {
    await staff();
    const operation=value(form,'operation');
    const actor=await getSession();
    if(!allowRequest(`commercial-${operation}`,actor!.sub,operation.startsWith('password-')?10:60,60000)) throw new Error('Trop de demandes. Réessayez dans une minute.');
    if(operation==='password-self' || operation==='password-client') {
      const session=await getSession();
      const operator=readDb().users.find(u=>u.id===session?.sub && u.role==='admin');
      const current=String(form.get('currentPassword')??'');
      if(!operator) throw new Error('Accès commercial requis.');
      if(operation==='password-self' && !await bcrypt.compare(current,operator.passwordHash)) throw new Error('Votre mot de passe actuel est incorrect.');
      const password=String(form.get('password')??'');
      if(password.length<12 || Buffer.byteLength(password)>72) throw new Error('Mot de passe : au moins 12 caractères et au maximum 72 octets.');
      if(password!==String(form.get('confirmation')??'')) throw new Error('Les deux nouveaux mots de passe ne correspondent pas.');
      const passwordHash=await bcrypt.hash(password,12);
      await staff();
      const db=structuredClone(readDb());
      if(db.users.find(u=>u.id===operator.id)?.passwordHash!==operator.passwordHash) throw new Error('Votre compte a changé. Reconnectez-vous.');
      const user=operation==='password-self'?db.users.find(u=>u.id===operator.id):db.users.find(u=>u.id===value(form,'client') && u.role==='client');
      if(!user) throw new Error('Compte client introuvable.');
      user.passwordHash=passwordHash; user.authVersion=(user.authVersion??0)+1;
      writeDb(db);
      if(operation==='password-self') await createSession({sub:user.id,email:user.email,name:user.name,role:user.role});
    } else if (operation==='client') {
      const email=text(form,'email').toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Adresse e-mail invalide.');
      const password=String(form.get('password')??'');
      if(password.length<12 || Buffer.byteLength(password)>72) throw new Error('Mot de passe : au moins 12 caractères et au maximum 72 octets.');
      const passwordHash=await bcrypt.hash(password,12);
      const db=structuredClone(readDb()); const {project,lot}=target(db,form);
      if (!lot) throw new Error('Sélectionnez un appartement.');
      if(db.users.some(u=>u.email.toLowerCase()===email)) throw new Error('Cette adresse possède déjà un compte.');
      if(db.users.some(u=>u.role==='client' && u.projectSlug===project.slug && u.lotRef===lot.ref)) throw new Error('Cet appartement possède déjà un compte client.');
      db.users.push({id:randomUUID(),name:text(form,'name'),email,phone:value(form,'phone'),passwordHash,role:'client',projectSlug:project.slug,lotRef:lot.ref,documents:[],messages:[],payments:[]});
      writeDb(db);
    } else if(operation==='upload') {
      const file=form.get('file');
      if (!(file instanceof File) || !file.size || file.size>8*1024*1024) throw new Error('Sélectionnez un PDF ou une photo de moins de 8 Mo.');
      const label=text(form,'label'); const kind=value(form,'kind');
      if(!['contract','gallery','construction'].includes(kind)) throw new Error('Type de publication invalide.');
      let bytes=Buffer.from(await file.arrayBuffer()); let mime='application/pdf';
      if(kind==='contract') { if(bytes.subarray(0,5).toString()!=='%PDF-') throw new Error('Le contrat doit être un fichier PDF.'); }
      else {
        const metadata=await sharp(bytes,{limitInputPixels:40000000}).metadata();
        if(!['jpeg','png','webp'].includes(metadata.format??'')) throw new Error('Formats photo acceptés : JPEG, PNG et WebP.');
        bytes=await sharp(bytes,{limitInputPixels:40000000}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer(); mime='image/webp';
      }
      const db=structuredClone(readDb()); const id=randomUUID(); const href=`/api/media/${id}`;
      const recipient=kind==='contract' ? db.users.find(u=>u.id===value(form,'client') && u.role==='client') : undefined;
      if(kind==='contract' && !recipient) throw new Error('Client introuvable.');
      if(recipient) {
        (recipient.documents??=[]).push({id,label:localize(label),kind:'contract',date:new Date().toISOString(),href});
        (recipient.messages??=[]).push({id:randomUUID(),from:'imf',date:new Date().toISOString(),body:`Un document est disponible dans votre espace Documents : ${label}`});
      } else {
        const {project,lot}=target(db,form); const dest=lot??project; const photo={src:href,caption:localize(label)};
        if(kind==='gallery') (dest.gallery??=[]).push(photo); else (dest.constructionPhotos??=[]).push(photo);
      }
      const dir=path.join(process.cwd(),'data','uploads'); fs.mkdirSync(dir,{recursive:true}); savedFile=path.join(dir,id); fs.writeFileSync(savedFile,bytes,{flag:'wx'});
      (db.uploads??=[]).push({id,mime,name:label+(kind==='contract'?'.pdf':'.webp'),clientId:recipient?.id,public:kind==='gallery'});
      writeDb(db); savedFile=undefined;
    } else {
      const db=structuredClone(readDb());
      if(operation==='client-edit') {
        const client=db.users.find(u=>u.id===value(form,'client') && u.role==='client');
        if(!client) throw new Error('Client introuvable.');
        const email=text(form,'email').toLowerCase();
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Adresse e-mail invalide.');
        if(db.users.some(u=>u.id!==client.id && u.email.toLowerCase()===email)) throw new Error('Cette adresse possède déjà un compte.');
        const {project,lot}=target(db,form);
        if(!lot) throw new Error('Sélectionnez un appartement.');
        if(db.users.some(u=>u.id!==client.id && u.role==='client' && u.projectSlug===project.slug && u.lotRef===lot.ref)) throw new Error('Cet appartement possède déjà un compte client.');
        const phone=value(form,'phone'); if(phone.length>80) throw new Error('Téléphone trop long.');
        Object.assign(client,{name:text(form,'name'),email,phone,projectSlug:project.slug,lotRef:lot.ref});
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
      } else if(operation==='property') {
        const {project,lot}=target(db,form); (lot??project).progressPercent=percent(form);
        if(lot) { const status=value(form,'status'); if(!['available','reserved','sold'].includes(status)) throw new Error('Statut invalide.'); lot.status=status as typeof lot.status; }
      } else if(operation==='company') {
        const email=text(form,'email'); if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Adresse e-mail invalide.');
        db.company={legalName:text(form,'name'),email,phone:text(form,'phone'),address:text(form,'address'),city:text(form,'city'),about:text(form,'about',2000)};
      } else if(operation==='message') {
        const client=db.users.find(u=>u.id===value(form,'client') && u.role==='client'); if(!client) throw new Error('Client introuvable.');
        (client.messages??=[]).push({id:randomUUID(),date:new Date().toISOString(),from:'imf',body:text(form,'body',4000)});
      } else throw new Error('Opération inconnue.');
      writeDb(db);
    }
    revalidatePath('/','layout');
    return {ok:true,message:operation==='client'?'Compte créé. Communiquez les identifiants au client par votre canal habituel.':operation==='upload'?'Publication enregistrée. Le destinataire peut la consulter dans son espace.':'Modifications enregistrées.'};
  } catch(error) {
    if(savedFile) fs.rmSync(savedFile,{force:true});
    return {ok:false,message:error instanceof Error ? error.message : 'Enregistrement impossible.'};
  }
}
