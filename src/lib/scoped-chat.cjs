const {randomUUID}=require('node:crypto');
async function postMessage(pool,actorId,recipient,body){
 if(!body || body.length>4000)throw new Error('Message invalide.');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const actor=(await client.query('SELECT id,role FROM imf_users WHERE id=$1 FOR KEY SHARE',[actorId])).rows[0];
  if(!actor || !['admin','client'].includes(actor.role))throw new Error('Accès refusé.');
  const id=actor.role==='admin'?recipient:actor.id;
  if(!(await client.query("SELECT 1 FROM imf_users WHERE id=$1 AND role='client' FOR KEY SHARE",[id])).rows.length)throw new Error('Client introuvable.');
  const messageId=randomUUID();
  await client.query('INSERT INTO imf_messages(client_id,id,sender,sent_at,body) VALUES($1,$2,$3,now(),$4)',[id,messageId,actor.role==='admin'?'imf':'client',body]);
  const event={id:randomUUID(),at:new Date().toISOString(),actorId,operation:'chat-send',changes:[{target:`messages/${id}/${messageId}`,before:null,after:{from:actor.role==='admin'?'imf':'client',body:'[redacted]'}}]};
  await client.query('INSERT INTO imf_audit_events(id,at,actor_id,operation,data) VALUES($1,$2,$3,$4,$5)',[event.id,event.at,actorId,event.operation,event]);
  await client.query('UPDATE imf_revision SET revision=revision+1 WHERE id=1');
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
module.exports={postMessage};
