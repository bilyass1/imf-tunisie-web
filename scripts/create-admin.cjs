// Explicit one-time provisioning. Never updates or deletes an existing account.
require('@next/env').loadEnvConfig(process.cwd());
const bcrypt=require('bcryptjs'),{randomUUID}=require('node:crypto'),fs=require('node:fs');
(async()=>{
 const email=(process.env.IMF_ADMIN_EMAIL??'').trim().toLowerCase(),password=process.env.IMF_ADMIN_PASSWORD??'';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12||Buffer.byteLength(password)>72)throw new Error('Provide IMF_ADMIN_EMAIL and a unique IMF_ADMIN_PASSWORD (12+ characters, at most 72 bytes).');
 const eventId=randomUUID(),at=new Date().toISOString();
 const user={id:randomUUID(),email,passwordHash:await bcrypt.hash(password,12),name:'Administration',role:'admin'};
 if(process.env.DATABASE_URL){
  const pool=require('./postgres-common.cjs').pool(),client=await pool.connect();
  try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(834921)');
   if((await client.query("SELECT 1 FROM imf_users WHERE role='admin' LIMIT 1")).rows.length)throw new Error('An administrator already exists. Provisioning refused; no accounts changed.');
   await client.query('INSERT INTO imf_users(id,email,role,password_hash,data) VALUES($1,$2,$3,$4,$5)',[user.id,email,'admin',user.passwordHash,{id:user.id,email,name:user.name,role:'admin'}]);await client.query('INSERT INTO imf_audit_events(id,at,actor_id,operation,data) VALUES($1,$2,$3,$4,$5)',[eventId,at,user.id,'admin-provision',{id:eventId,at,actorId:user.id,operation:'admin-provision',changes:[{target:'users/'+user.id,before:null,after:{role:'admin'}}]}]);await client.query('UPDATE imf_revision SET revision=revision+1 WHERE id=1');await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
 }else{
  const file='data/db.json';if(!fs.existsSync(file))throw new Error('Start the local app once to create the public catalogue, then run this command.');
  const db=JSON.parse(fs.readFileSync(file,'utf8'));if(db.users.some(user=>user.role==='admin'))throw new Error('An administrator already exists. No accounts changed.');
  if(db.users.some(existing=>existing.email.toLowerCase()===email))throw new Error('Email already in use.');db.users.push(user);(db.auditEvents??=[]).push({id:eventId,at,actorId:user.id,operation:'admin-provision',changes:[{target:'users/'+user.id,before:null,after:{role:'admin'}}]});fs.writeFileSync(file+'.tmp',JSON.stringify(db,null,2));fs.renameSync(file+'.tmp',file);
 }
 console.log('Administrator created. No existing account was modified.');
})().catch(error=>{console.error(error.code?'Provisioning failed. Check database access.':error.message);process.exitCode=1;});
