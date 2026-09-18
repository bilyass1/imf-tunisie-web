'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getSession } from './session';
import { readDb, writeCommercialDb, isPersistent } from './db';
import { allowRequest } from './rate-limit';

export async function sendChatMessage(_: {ok:boolean;message:string}, form:FormData) {
  try {
    const session=await getSession();
    const db=structuredClone(readDb());
    const sender=db.users.find(u=>u.id===session?.sub);
    if(!sender) throw new Error('Veuillez vous reconnecter.');
    if(!allowRequest('chat',sender.id,30,60000)) throw new Error('Trop de messages. Réessayez dans une minute.');
    if(process.env.VERCEL || !isPersistent()) throw new Error('Le stockage durable des messages doit être configuré.');
    const client=sender.role==='admin'?db.users.find(u=>u.id===String(form.get('client')??'') && u.role==='client'):sender;
    if(!client || client.role!=='client') throw new Error('Client introuvable.');
    const body=String(form.get('body')??'').trim();
    if(!body || body.length>4000) throw new Error('Écrivez un message de 1 à 4 000 caractères.');
    (client.messages??=[]).push({id:randomUUID(),from:sender.role==='admin'?'imf':'client',date:new Date().toISOString(),body});
    writeCommercialDb(db);
    revalidatePath('/','layout');
    return {ok:true,message:'Message envoyé.'};
  } catch(error) {return {ok:false,message:error instanceof Error?error.message:'Envoi impossible. Réessayez.'};}
}
