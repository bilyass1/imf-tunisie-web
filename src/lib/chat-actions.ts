'use server';
import { getStore } from './postgres-store.cjs';
import { withAudit } from './audit';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getSession } from './session';
import { readDb, writeCommercialDb, isPersistent } from './db';
import { allowRequest } from './rate-limit';

export async function sendChatMessage(_: {ok:boolean;message:string}, form:FormData) {
  try {
    const session=await getSession();
    if(process.env.DATABASE_URL){
      if(!session || !await allowRequest('chat',session.sub,30,60000))throw new Error('Veuillez patienter ou vous reconnecter.');
      await getStore().postMessage(session.sub,String(form.get('client')??''),String(form.get('body')??'').trim());
      revalidatePath('/','layout');return {ok:true,message:'Message envoyé.'};
    }
    const db=(await readDb());
    const sender=db.users.find(u=>u.id===session?.sub);
    if(!sender) throw new Error('Veuillez vous reconnecter.');
    if(!await allowRequest('chat',sender.id,30,60000)) throw new Error('Trop de messages. Réessayez dans une minute.');
    if(!isPersistent()) throw new Error('Le stockage durable des messages doit être configuré.');
    const client=sender.role==='admin'?db.users.find(u=>u.id===String(form.get('client')??'') && u.role==='client'):sender;
    if(!client || client.role!=='client') throw new Error('Client introuvable.');
    const body=String(form.get('body')??'').trim();
    if(!body || body.length>4000) throw new Error('Écrivez un message de 1 à 4 000 caractères.');
    (client.messages??=[]).push({id:randomUUID(),from:sender.role==='admin'?'imf':'client',date:new Date().toISOString(),body});
    (await withAudit({actorId:sender.id,operation:'chat-send'},()=>writeCommercialDb(db)));
    revalidatePath('/','layout');
    return {ok:true,message:'Message envoyé.'};
  } catch(error) {return {ok:false,message:error instanceof Error?error.message:'Envoi impossible. Réessayez.'};}
}
