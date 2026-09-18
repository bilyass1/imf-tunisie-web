const fs=require('node:fs');
const {Pool}=require('pg');
const {configuration:config}=require('../src/lib/postgres-store.cjs');
function pool(){return new Pool(config());}
function rows(db){
 for(const key of ['projects','users','news','contacts','deals','activities','tasks'])if(!Array.isArray(db[key]))throw new Error('Collection manquante : '+key);
 const users=new Set(),emails=new Set(),lots=new Set(),assignments=new Set();
 for(const p of db.projects)for(const l of p.lots){const key=JSON.stringify([p.slug,l.ref]);if(lots.has(key))throw new Error('Appartement dupliqué.');lots.add(key);}
 for(const u of db.users){
  if(users.has(u.id)||emails.has(u.email.toLowerCase()))throw new Error('Compte ou e-mail dupliqué.');users.add(u.id);emails.add(u.email.toLowerCase());
  if(u.projectSlug||u.lotRef){const key=JSON.stringify([u.projectSlug,u.lotRef]);if(!lots.has(key))throw new Error('Appartement client introuvable.');if(u.role==='client'){if(assignments.has(key))throw new Error('Appartement attribué deux fois.');assignments.add(key);}}
 }
 return db;
}
async function importData(client,db){
 rows(db);
 for(const p of db.projects){const {lots,...data}=p;await client.query('INSERT INTO imf_projects(slug,data) VALUES($1,$2)',[p.slug,data]);for(const l of lots)await client.query('INSERT INTO imf_lots(project_slug,ref,status,data) VALUES($1,$2,$3,$4)',[p.slug,l.ref,l.status,l]);}
 for(const u of db.users){
  const {passwordHash,authVersion,documents,archivedDocuments,messages,...data}=u;
  await client.query('INSERT INTO imf_users(id,email,role,password_hash,auth_version,project_slug,lot_ref,data) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[u.id,u.email,u.role,passwordHash,authVersion??0,u.projectSlug??null,u.lotRef??null,data]);
  for(const m of messages??[])await client.query('INSERT INTO imf_messages(client_id,id,sender,sent_at,body) VALUES($1,$2,$3,$4,$5)',[u.id,m.id,m.from,m.date,m.body]);
  for(const [list,archived] of [[documents,false],[archivedDocuments,true]])for(const d of list??[])await client.query('INSERT INTO imf_documents(client_id,id,archived,data) VALUES($1,$2,$3,$4)',[u.id,d.id,archived,d]);
 }
 for(const collection of ['news','contacts','deals','activities','tasks','uploads'])for(const [position,item] of (db[collection]??[]).entries())await client.query('INSERT INTO imf_records(collection,id,position,data) VALUES($1,$2,$3,$4)',[collection,item.id??item.slug,position,item]);
 if(db.company)await client.query('INSERT INTO imf_records(collection,id,position,data) VALUES($1,$2,$3,$4)',['settings','company',0,db.company]);
}
module.exports={config,pool,rows,importData};
