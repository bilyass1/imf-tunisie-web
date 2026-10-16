const {randomUUID}=require('node:crypto');
async function captureLead(pool,input){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const normalizedPhone=input.phone.replace(/\s/g,''),date=new Date().toISOString().slice(0,10);
  // Different visitors do not serialize on the whole CRM. Matching contacts share one lock.
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[(input.email??normalizedPhone).toLowerCase()]);
  const lot=input.projectSlug&&input.lotRef?(await client.query("SELECT ref,status FROM imf_lots WHERE project_slug=$1 AND (ref=$2 OR data->>'code'=$2) FOR SHARE",[input.projectSlug,input.lotRef])).rows[0]:undefined;
  if(input.visit&&(!lot||lot.status!=='available'))throw new Error('VISIT_UNAVAILABLE');
  const project=input.projectSlug?(await client.query('SELECT 1 FROM imf_projects WHERE slug=$1',[input.projectSlug])).rows.length>0:false;
  const prior=(await client.query("SELECT data FROM imf_records WHERE collection='contacts' AND (regexp_replace(data->>'phone','\\s','','g')=$1 OR ($2<>'' AND lower(data->>'email')=$2)) ORDER BY id LIMIT 1 FOR UPDATE",[normalizedPhone,(input.email??'').toLowerCase()])).rows[0]?.data;
  const contact=prior??{id:'c-'+randomUUID(),createdAt:date,name:input.name,email:input.email||undefined,phone:input.phone,source:'website',projectSlug:project?input.projectSlug:undefined,lotRef:lot?.ref,budget:input.budget||undefined,tags:[]};
  const ref=lot?.ref??input.lotRef;
  const deal={id:'d-'+randomUUID(),createdAt:date,updatedAt:date,contactId:contact.id,title:input.visit?`${ref} — demande de visite`:ref?`${ref} — demande web`:'Demande d’information — site web',projectSlug:project?input.projectSlug:undefined,lotRef:lot?.ref,stage:'new',probability:10};
  const activity={id:'a-'+randomUUID(),date,type:'note',contactId:contact.id,dealId:deal.id,body:input.visit?`Demande de visite à confirmer · ${input.visit.date} à ${input.visit.time} (heure de Tunis) · ${input.visit.mode==='video'?'Visioconférence':'Sur place'}\n${input.message}`:input.message};
  const task={id:'t-'+randomUUID(),createdAt:date,title:input.visit?`Confirmer la visite de ${contact.name} · ${ref} · ${input.visit.date} ${input.visit.time} (Tunis)`:`Rappeler ${contact.name} (demande web)`,dueDate:date,done:false,contactId:contact.id,dealId:deal.id};
  for(const [collection,data] of [...(!prior?[['contacts',contact]]:[]),['deals',deal],['activities',activity],['tasks',task]]){
   await client.query('INSERT INTO imf_records(collection,id,position,data) VALUES($1,$2,$3,$4)',[collection,data.id,-Math.min(2147483647,Math.floor(Date.now()/1000)),data]);
  }
  const event={id:randomUUID(),at:new Date().toISOString(),actorId:'public',operation:'capture-lead',changes:[{target:`contacts/${contact.id}`,before:prior?'[existing]':null,after:'[redacted]'},{target:`deals/${deal.id}`,before:null,after:{stage:'new'}}]};
  await client.query('INSERT INTO imf_audit_events(id,at,actor_id,operation,data) VALUES($1,$2,$3,$4,$5)',[event.id,event.at,event.actorId,event.operation,event]);
  await client.query('UPDATE imf_revision SET revision=revision+1 WHERE id=1');await client.query('COMMIT');return {contact,deal};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
module.exports={captureLead};
