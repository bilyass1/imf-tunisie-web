// Runs actual PostgreSQL SQL in an isolated in-memory PGlite database.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {createStore,configuration}=require('../src/lib/postgres-store.cjs');
const {importData}=require('./postgres-common.cjs');

(async()=>{
 const engine=new PGlite();
 try {
  await engine.exec(fs.readFileSync('database/001-initial.sql','utf8'));
  await engine.exec(fs.readFileSync('database/002-runtime.sql','utf8'));
  const query=(sql,params)=>engine.query(sql,params);
  const pool={connect:async()=>({query,release(){}}),query};
  const fixture={projects:[{slug:'p',name:'Test',lots:[{ref:'A',status:'available'},{ref:'B',status:'available'}]}],
   users:[{id:'admin',email:'admin@example.test',name:'Admin',role:'admin',passwordHash:'hash'},
    {id:'client',email:'client@example.test',name:'Client',role:'client',passwordHash:'hash',projectSlug:'p',lotRef:'A',messages:[],documents:[]}],
   news:[],contacts:[],deals:[],activities:[],tasks:[]};
  await importData({query},fixture);
  const store=createStore(pool);
  const publicBefore=await store.readPublic();
  assert.deepEqual(Object.keys(publicBefore).sort(),['company','news','projects']);
  assert.equal(publicBefore.projects[0].lots[0].status,'available');
  assert(!JSON.stringify(publicBefore).includes('passwordHash'));
  publicBefore.projects[0].lots[0].status='sold';
  assert.equal((await store.readPublic()).projects[0].lots[0].status,'available','Public reads must be isolated');
  const first=await store.read(), stale=await store.read();
  first.projects[0].lots[0].status='reserved';
  first.users.find(u=>u.id==='client').messages.push({id:'m',from:'client',date:new Date().toISOString(),body:"'; DROP TABLE imf_users; --"});
  await store.write(first);
  assert.equal((await store.readPublic()).projects[0].lots[0].status,'reserved','Writes invalidate the public cache');
  await assert.rejects(()=>store.write(stale),/autre utilisateur/);
  let persisted=await store.read();
  assert.equal(persisted.projects[0].lots[0].status,'reserved');
  assert.equal(persisted.users.find(u=>u.id==='client').messages.length,1);
  const invalid=await store.read();
  invalid.projects[0].lots[0].status='sold';
  invalid.users.push({...invalid.users[0],id:'duplicate',email:'ADMIN@example.test'});
  await assert.rejects(()=>store.write(invalid));
  assert.equal((await store.read()).projects[0].lots[0].status,'reserved','failed user constraint must roll back property changes');
  persisted=await store.read();
  const id='aabbccdd-0000-4000-8000-000000000001';
  persisted.uploads.push({id,mime:'application/pdf',name:'test.pdf',public:false,clientId:'client'});
  persisted.users.find(u=>u.id==='client').documents.push({id,href:`/api/media/${id}`,kind:'contract',date:'2026-09-18',label:{fr:'Test',en:'Test',ar:'Test'}});
  await store.write(persisted,{id,bytes:Buffer.from('%PDF-test')});
  assert.equal(Buffer.from(await createStore(pool).readMedia(id)).toString(),'%PDF-test','bytes survive a fresh store instance');
  persisted=await store.read();
  const client=persisted.users.find(u=>u.id==='client');
  client.archivedDocuments.push(client.documents.pop());
  client.passwordHash='new-hash';client.authVersion=1;
  await store.write(persisted);
  const saved=(await createStore(pool).read()).users.find(u=>u.id==='client');
  assert.equal(saved.archivedDocuments.length,1);assert.equal(saved.documents.length,0);assert.equal(saved.authVersion,1);
  persisted=await store.read();persisted.contacts.push({id:'test-contact',name:'Test'});await store.write(persisted);
  persisted=await store.read();persisted.contacts=[];await store.write(persisted);assert.equal((await store.read()).contacts.length,0);
  persisted=await store.read();persisted.company={legalName:'Test',email:'test@example.test',phone:'123',address:'Test',city:'Tunis',about:'Test'};await store.write(persisted);
  assert.equal((await store.read()).company.legalName,'Test');
  const config=configuration({DATABASE_URL:'postgresql://u:p@db.example.test/app?sslmode=require'});
  assert.equal(config.ssl.rejectUnauthorized,true);assert.ok(!config.connectionString.includes('sslmode'));
  console.log('PASS: PostgreSQL round trip, stale-write rejection, atomic rollback, unique email, private media persistence, document archive, auth version and company settings.');
 } finally {await engine.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
