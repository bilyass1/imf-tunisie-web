// Isolated regression tests. No live accounts, production secrets or databases.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,imports,env={}){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module:mod,exports:mod.exports,require:id=>id==='server-only'?{}:imports[id]??require(id),process:{env},Buffer,TextEncoder,URL,console,Date,FormData,Uint8Array,ArrayBuffer,AbortSignal});return mod.exports;}
(async()=>{
 const env={NODE_ENV:'production'},guard=load('src/lib/runtime-security.ts',{},env);assert.throws(()=>guard.assertProductionStorage(),/PostgreSQL/);env.DATABASE_URL='postgres://fixture@localhost/imf_test';assert.throws(()=>guard.assertProductionStorage(),/AUTH_SECRET/);env.AUTH_SECRET=require('node:crypto').randomBytes(48).toString('hex');guard.assertProductionStorage();
 let header='192.0.2.1';const buckets=new Map(),allowRequest=async(scope,id,max)=>{const key=scope+id,count=(buckets.get(key)??0)+1;buckets.set(key,count);return count<=max;};
 const proxyEnv={NODE_ENV:'production',TRUSTED_CLIENT_IP_HEADER:'x-real-ip'};
 const limits=load('src/lib/anonymous-limits.ts',{'next/headers':{headers:async()=>new Headers({'x-real-ip':header}),cookies:async()=>({get:()=>undefined,set:()=>{}})},'./rate-limit':{allowRequest}},proxyEnv);
 assert.equal(await limits.allowAnonymous('login','victim@example.test'),true);for(let i=0;i<40;i++)await limits.allowAnonymous('login','victim@example.test');header='192.0.2.2';assert.equal(await limits.allowAnonymous('login','victim@example.test'),true,'An attacker must not exhaust another source/account pair');header='192.0.2.3,192.0.2.4';assert.equal(await limits.allowAnonymous('login','victim@example.test'),false);header='2001:db8:1234:5678::1';const source=await limits.visitorIdentity();header='2001:db8:1234:5678::ffff';assert.equal(await limits.visitorIdentity(),source,'IPv6 addresses in the same /64 share a bucket');delete proxyEnv.TRUSTED_CLIENT_IP_HEADER;assert.equal(await limits.allowAnonymous('contact','fixture'),false,'Production never trusts arbitrary forwarded headers');
 let user,calls=[],sessions=0;
 const actions=load('src/lib/actions.ts',new Proxy({'bcryptjs':{compare:async(_password,hash)=>{calls.push(hash);return false;}},'./anonymous-limits':{allowAnonymous:async()=>true},'./db':{getAuthUserByEmail:async()=>user},'@/i18n/config':{isLocale:()=>true},'./session':{createSession:async()=>sessions++}}, {get:(target,key)=>key in target?target[key]:{}}));
 const form=new FormData();form.set('email','unknown@example.test');form.set('password','test-only-input');
 assert.equal((await actions.loginAction({ok:false},form)).error,'invalid');assert.equal(calls.length,1);assert(calls[0].startsWith('$2a$12$'));
 user={id:'fixture',passwordHash:'stored-hash',role:'client'};assert.equal((await actions.loginAction({ok:false},form)).error,'invalid');assert.equal(calls.length,2);assert.equal(calls[1],'stored-hash');assert.equal(sessions,0);

 const token=require('node:crypto').randomBytes(32).toString('hex'),jar=new Map();let pending,consumptions=0;
 const authUser={id:'admin-fixture',email:'admin@example.test',role:'admin',authVersion:0};
 const authQueries=async(sql,params)=>{
  if(sql.startsWith('SELECT id,transports')||sql.startsWith('SELECT 1 FROM imf_passkeys'))return {rows:[]};
  if(sql.startsWith('INSERT INTO imf_auth_challenges')){pending={client_id:params[1],purpose:params[2],challenge:params[3],auth_version:params[4]};return {rows:[]};}
  if(sql.startsWith('DELETE FROM imf_auth_challenges WHERE id=')){consumptions++;const challenge=pending;pending=undefined;return {rows:challenge?[challenge]:[]};}
  return {rows:[]};
 };
 const keys=load('src/lib/admin-passkeys.ts',{'next/headers':{cookies:async()=>({set:(key,value)=>jar.set(key,value),get:key=>({value:jar.get(key)}),delete:key=>jar.delete(key)})},'./postgres-store.cjs':{getStore:()=>({securityQuery:authQueries,readAuthUser:async()=>authUser})},'./rate-limit':{allowRequest:async()=>true}},{APP_ORIGIN:'https://example.test',ADMIN_PASSKEY_ENROLLMENT_TOKEN:token});
 await assert.rejects(()=>keys.beginAdminAuthentication(authUser,''),/jeton/);
 const registration=await keys.beginAdminAuthentication(authUser,token);assert.equal(registration.purpose,'register');assert.equal(registration.options.authenticatorSelection.userVerification,'required');assert(registration.options.challenge);
 await assert.rejects(()=>keys.finishAdminAuthentication({id:'forged',response:{}}));assert.equal(consumptions,1);await assert.rejects(()=>keys.finishAdminAuthentication({id:'forged',response:{}}));assert.equal(consumptions,1,'Consumed challenge cookie cannot replay');
 const bounded=load('src/lib/bounded-json.ts',{});assert.equal((await bounded.boundedJson(new Request('https://example.test',{method:'POST',body:'{"ok":true}'}))).ok,true);await assert.rejects(()=>bounded.boundedJson(new Request('https://example.test',{method:'POST',body:'x'.repeat(100)}),10),/large/);
 const commands=[];class Command{constructor(input){this.input=input;}}class FakeS3{async send(command){commands.push(command.input);return {Body:{transformToByteArray:async()=>Buffer.from('fixture')}};}}
 const objects=load('src/lib/object-media.cjs',{'@aws-sdk/client-s3':{S3Client:FakeS3,PutObjectCommand:Command,GetObjectCommand:Command,DeleteObjectCommand:Command}},{MEDIA_S3_BUCKET:'test-private-bucket'});
 const object=await objects.put('fixture-id',Buffer.from('fixture'));assert.equal(object.size,7);assert.equal(commands[0].ServerSideEncryption,'AES256');assert.equal(commands[0].ACL,undefined);await objects.read(object.key,1,3);assert.equal(commands[1].Range,'bytes=1-3');
 const {PGlite}=require('@electric-sql/pglite'),{createStore}=require('../src/lib/postgres-store.cjs');const engine=new PGlite();const query=(sql,params)=>!params&&sql.includes(';')?engine.exec(sql):engine.query(sql,params);const pool={query,connect:async()=>({query,release(){}})};
 try{
  await assert.rejects(()=>createStore(pool).revision());assert.equal((await query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n,0,'Runtime must never create tables');
  await require('./migrations.cjs').migrate({query});await require('./migrations.cjs').migrate({query});assert.equal((await query('SELECT max(version)::int AS n FROM imf_schema_migrations')).rows[0].n,6);
  await assert.rejects(()=>query("INSERT INTO imf_users(id,email,role,password_hash,data) VALUES('u','u@example.test','unknown','fixture','{}')"));
  await query("INSERT INTO imf_projects(slug,data) VALUES('p','{}')");await query("INSERT INTO imf_lots(project_slug,ref,status,data) VALUES('p','A','reserved','{}'),('p','B','sold','{}')");
  await query("INSERT INTO imf_users(id,email,role,password_hash,project_slug,lot_ref,data) VALUES('a','a@example.test','client','fixture','p','A',$1)",[{properties:[{projectSlug:'p',lotRef:'A'},{projectSlug:'p',lotRef:'B'}]}]);
  await assert.rejects(()=>query("INSERT INTO imf_users(id,email,role,password_hash,data) VALUES('b','b@example.test','client','fixture',$1)",[{properties:[{projectSlug:'p',lotRef:'B'}]}]),/unique|duplicate/i);
  await assert.rejects(()=>query("INSERT INTO imf_users(id,email,role,password_hash,data) VALUES('c','c@example.test','client','fixture',$1)",[{properties:[{projectSlug:'p',lotRef:'missing'}]}]),/foreign key/i);
  const store=createStore(pool);await store.postMessage('a','spoofed-recipient','Private fixture message');assert.equal((await query('SELECT client_id FROM imf_messages')).rows[0].client_id,'a');assert(!JSON.stringify((await store.readAudit())[0]).includes('Private fixture message'));
  await assert.rejects(()=>store.postMessage('missing','a','Denied'));
  const result=await store.captureLead({name:'Fixture',phone:'000',email:'fixture@example.test',message:'Private fixture lead',projectSlug:'p',lotRef:'A'});assert(result.contact.id);assert.equal((await query("SELECT count(*)::int AS n FROM imf_records WHERE collection='tasks'")).rows[0].n,1);
  await assert.rejects(()=>store.captureLead({name:'Fixture',phone:'000',message:'Visit',projectSlug:'p',lotRef:'B',visit:{date:'2026-10-16',time:'12:00',mode:'video'}}),/VISIT_UNAVAILABLE/);
  assert.equal((await query('SELECT count(*)::int AS n FROM imf_audit_events')).rows[0].n,2);
  const constraints=async q=>[...new Set((await q("SELECT conrelid::regclass::text AS table_name,contype,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace")).rows.map(row=>JSON.stringify(row)))].sort();
  const cleanConstraints=await constraints(query),legacy=new PGlite();try{
   await legacy.exec(fs.readFileSync('tests/fixtures/legacy-schema.sql','utf8'));
   const legacyQuery=(sql,params)=>!params&&sql.includes(';')?legacy.exec(sql):legacy.query(sql,params);
   await require('./migrations.cjs').migrate({query:legacyQuery});
   assert.deepEqual(await constraints(legacyQuery),cleanConstraints,'Fresh and historical runtime databases have the same canonical integrity constraints');
  }finally{await legacy.close();}
 }finally{await engine.close();}
 console.log('PASS: mandatory production storage/secrets, trustworthy source isolation, unknown-email bcrypt work, migrations without runtime DDL, secondary uniqueness/FKs and focused audited message/lead commands.');
})().catch(error=>{console.error(error);process.exitCode=1;});
