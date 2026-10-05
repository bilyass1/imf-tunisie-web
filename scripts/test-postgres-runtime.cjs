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
  await engine.exec(fs.readFileSync('database/003-rate-limits.sql','utf8'));
  const query=(sql,params)=>engine.query(sql,params);
  const pool={connect:async()=>({query,release(){}}),query};
  const fixture={projects:[{slug:'a-p',name:'Test',progress:[{label:{fr:'Façades',en:'Facades',ar:'الواجهات'},percent:70,done:false}],lots:[{ref:'A',status:'available'},{ref:'B',status:'available'}]},
   {slug:'diar-al-yassamine',name:'Diar Al Yassamine',lots:[{ref:'Y1',status:'sold'},{ref:'Y2',status:'reserved'}]}],
   users:[{id:'admin',email:'admin@example.test',name:'Admin',role:'admin',passwordHash:'hash'},
    {id:'client',email:'client@example.test',name:'Client',role:'client',passwordHash:'hash',projectSlug:'a-p',lotRef:'A',properties:[{projectSlug:'a-p',lotRef:'A'},{projectSlug:'a-p',lotRef:'B'}],messages:[],documents:[]}],
   news:[],contacts:[],deals:[],activities:[],tasks:[]};
  await importData({query},fixture);
  const store=createStore(pool);
  const publicInstance=createStore(pool); // separate Vercel function with its own warm cache
  assert.deepEqual((await store.readPublic()).projects[1].lots.map(lot=>lot.status),['available','available'],'One-time availability correction reaches old PostgreSQL lots');
  assert.equal((await query('SELECT count(*)::int AS count FROM imf_schema_migrations WHERE version=4')).rows[0].count,1);
  const afterMigration=await store.read();
  afterMigration.projects[1].lots[0].status='sold';
  await store.write(afterMigration);
  assert.equal((await publicInstance.readPublic()).projects[1].lots[0].status,'sold','A later admin status change must not be reset');
  assert.equal((await store.readAuthUser('email','ADMIN@example.test')).id,'admin');
  assert.equal((await publicInstance.readAuthUser('id','client')).role,'client');
  assert.equal(await store.readAuthUser('id','unknown'),undefined);
  assert(!JSON.stringify(await store.readAuthUser('id','client')).includes('documents'),'Auth lookup must not load documents');
  assert.equal((await store.readUserById('client')).messages.length,0);
  assert.equal((await store.readUserById('client')).properties.length,2);
  assert.equal(await store.readUserById('unknown'),undefined);
  assert.equal(await store.consumeRateLimit('shared-login',2,1000,100),true);
  assert.equal(await publicInstance.consumeRateLimit('shared-login',2,1000,101),true);
  assert.equal(await store.consumeRateLimit('shared-login',2,1000,102),false,'All instances share the same limit');
  assert.equal(await publicInstance.consumeRateLimit('shared-login',2,1000,1101),true,'Window resets after expiry');
  const concurrent=await Promise.all(Array.from({length:8},(_,index)=>(index%2?store:publicInstance).consumeRateLimit('parallel-login',3,1000,200)));
  assert.equal(concurrent.filter(Boolean).length,3,'Concurrent instances must not exceed the limit');
  const publicBefore=await store.readPublic();
  assert.equal((await publicInstance.readPublic()).projects[0].lots[0].status,'available');
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
  assert.equal((await publicInstance.readPublic()).projects[0].lots[0].status,'reserved','Other server instances must see changed availability immediately');
  assert.equal((await publicInstance.read()).projects[0].lots[0].status,'reserved','Other admin instances must not retain old snapshots');
  let galleryUpdate=await store.read();
  galleryUpdate.projects[0].gallery=[{src:'/api/media/aabbccdd-0000-4000-8000-000000000002',caption:{fr:'Chantier',en:'Construction',ar:'الأشغال'}}];
  await store.write(galleryUpdate);
  assert.equal((await publicInstance.readPublic()).projects[0].gallery.length,1,'Other server instances must see gallery uploads');
  galleryUpdate=await store.read();
  galleryUpdate.projects[0].progress[0].percent=75;
  galleryUpdate.projects[0].lots[0].rooms=[{id:'salon',label:{fr:'Séjour',en:'Living room',ar:'غرفة الجلوس'},panorama:'/api/media/aabbccdd-0000-4000-8000-000000000003'}];
  galleryUpdate.uploads.push({id:'aabbccdd-0000-4000-8000-000000000003',mime:'image/webp',name:'Salon.webp',public:true});
  await store.write(galleryUpdate,{id:'aabbccdd-0000-4000-8000-000000000003',bytes:Buffer.from('test-webp')});
  const publicTour=(await publicInstance.readPublic()).projects[0].lots[0];
  assert.equal(publicTour.rooms?.[0]?.panorama,'/api/media/aabbccdd-0000-4000-8000-000000000003',`Other instances must see new tours: ${JSON.stringify(publicTour)}`);
  assert.equal((await publicInstance.readPublic()).projects[0].progress[0].percent,75,'Progress steps must be visible across instances');
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
  assert.equal((await createStore(pool).readMediaMetadata(id)).clientId,'client');
  assert.equal(await store.readMediaMetadata('missing'),undefined);
  assert.equal(Buffer.from(await createStore(pool).readMedia(id)).toString(),'%PDF-test','bytes survive a fresh store instance');
  assert.equal((await createStore(pool).readUserById('client')).documents[0].href,`/api/media/${id}`);
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
  assert.equal((await publicInstance.readPublic()).company.legalName,'Test','Other server instances must see company edits');
  const config=configuration({DATABASE_URL:'postgresql://u:p@db.example.test/app?sslmode=require'});
  assert.equal(config.ssl.rejectUnauthorized,true);assert.ok(!config.connectionString.includes('sslmode'));
  console.log('PASS: PostgreSQL round trip, public gallery/progress/panorama updates, stale-write rejection, atomic rollback, unique email, private media, document archive, auth version and company settings.');
 } finally {await engine.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
