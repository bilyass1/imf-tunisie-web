const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {PGlite}=require('@electric-sql/pglite');
const {createStore,configuration}=require('../src/lib/postgres-store.cjs');
(async()=>{
 const engine=new PGlite();
 try{
  const query=(sql,params)=>!params&&sql.includes(';')?engine.exec(sql):engine.query(sql,params);
  await require('./migrations.cjs').migrate({query});
  const statements=[];const pool={query:async(sql,args)=>{statements.push(sql);return query(sql,args);},connect:async()=>({query,release(){}})};
  await query("INSERT INTO imf_projects(slug,data) VALUES('p',$1)",[{name:'Élégance',city:'Tunis',address:{fr:'Tunis',en:'Tunis',ar:'تونس'},mapQuery:'Tunis',cover:'/cover.webp'}]);
  for(let i=0;i<65;i++){
   const ref='A'+String(i).padStart(3,'0');
   await query('INSERT INTO imf_lots(project_slug,ref,status,data) VALUES($1,$2,$3,$4)',['p',ref,i%2?'available':'reserved',{code:ref,typology:'S+2',floor:1,sellableArea:60+i,price:100000+i,reservationNote:'PRIVATE',planDwgUrl:'/private.dwg'}]);
   for(const [collection,data] of [['contacts',{id:'c'+ref,name:ref,phone:'000',source:'website',createdAt:'2026-10-16',tags:[]}],['deals',{id:'d'+ref,title:'Deal',contactId:'c'+ref,stage:i%2?'sold':'new',value:100,probability:10}],['tasks',{id:'t'+ref,contactId:'c'+ref,title:'Task',dueDate:'2026-01-01',done:false}],['activities',{id:'a'+ref,contactId:'c'+ref,type:'note',body:'Private',date:'2026-10-16'}]])await query('INSERT INTO imf_records(collection,id,position,data) VALUES($1,$2,0,$3)',[collection,data.id,data]);
  }
  const store=createStore(pool);
  const summary=await store.crmDashboard();assert.equal(summary.contactCount,65);assert.equal(summary.available,32);assert.equal(summary.activities.length,8);assert.equal(summary.tasks.length,6);assert.equal(summary.stats.openDeals,33);assert.equal(summary.stats.wonValue,3200);assert(summary.activities[0].contactName);
  const first=await store.crmList('contacts',{limit:30});const second=await store.crmList('contacts',{limit:30,after:first.next});const third=await store.crmList('contacts',{limit:30,after:second.next});
  assert.equal(first.items.length,30);assert.equal(second.items.length,30);assert.equal(third.items.length,5);assert.equal(new Set([...first.items,...second.items,...third.items].map(x=>x.id)).size,65);assert.equal(first.items[0].dealCount,1);assert.equal(first.items[0].dealValue,100);
  assert.equal((await store.crmList('contacts',{query:'A064'})).items.length,1);await assert.rejects(()=>store.crmList('contacts',{limit:10000}));
  const filters={q:'Elegance',city:'',project:'',status:'',bedrooms:'',minPrice:'',maxPrice:'',minArea:'',maxArea:'',sort:'price-desc'};
  const search=await store.searchProperties(filters,'fr',1);assert.equal(search.total,65);assert.equal(search.items.length,24);assert.equal(search.items[0].ref,'A064');assert(!JSON.stringify(search).includes('PRIVATE'));assert(!JSON.stringify(search).includes('private.dwg'));
  const search2=await store.searchProperties(filters,'fr',2);assert.equal(search2.items[0].ref,'A040');assert.equal(search.projects.length,1);
  assert.equal((await store.searchProperties({...filters,status:'available',minArea:'100'},'fr',1)).total,12);
  assert(!statements.some(s=>/FROM imf_users|FROM imf_messages|FROM imf_documents/.test(s)),'CRM/search never load private account collections');
  const workspace=await store.readCrmWorkspace('deals','dA000');assert.equal(workspace.deals.length,1);assert.equal(workspace.contacts.length,0);workspace.deals[0].stage='contacted';await store.write(workspace);assert.equal((await query("SELECT count(*)::int AS n FROM imf_records WHERE collection='deals'")).rows[0].n,65);
  assert.equal((await store.readCrmWorkspace('deals','dA000')).deals[0].stage,'contacted');
  for(let i=0;i<65;i++)await query("INSERT INTO imf_users(id,email,role,password_hash,data) VALUES($1,$2,'client','never-return-this-hash',$3)",['u'+String(i).padStart(3,'0'),'fixture'+i+'@example.test',{name:'Fixture '+i,phone:'000',payments:[],paymentSchedules:[]}]);
  for(let i=0;i<102;i++)await query("INSERT INTO imf_messages(client_id,id,sender,sent_at,body) VALUES('u000',$1,'client','2026-10-16T10:00:00Z','Synthetic message')",['m'+String(i).padStart(3,'0')]);
  const directoryModule={exports:{}};
  const directoryCode=ts.transpileModule(fs.readFileSync('src/lib/client-directory.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(directoryCode,{module:directoryModule,exports:directoryModule.exports,process:{env:{DATABASE_URL:'fixture'}},require:id=>id==='server-only'?{}:id==='./db'?{}:id==='./postgres-store.cjs'?{getStore:()=>({securityQuery:query})}:require(id)});
  const firstClients=await directoryModule.exports.clientDirectory();assert.equal(firstClients.items.length,30);assert(firstClients.next);assert.equal(firstClients.items[0].messageCount,102);assert(!JSON.stringify(firstClients).includes('never-return-this-hash'));assert(!Object.hasOwn(firstClients.items[0],'passwordHash'));
  const latest=await directoryModule.exports.adminConversation('u000');assert.equal(latest.messages.length,100);assert.equal(latest.messages[0].id,'m002');assert.equal(latest.next,'m002');
  const earlier=await directoryModule.exports.adminConversation('u000',latest.next);assert.equal(earlier.messages.length,2);assert.equal(earlier.messages[0].id,'m000');assert.equal(earlier.next,undefined);assert.equal(await directoryModule.exports.adminConversation('unknown'),undefined);
  for(let i=0;i<4;i++)await query("INSERT INTO imf_web_vitals(id,metric,route,locale,device,value) VALUES($1,'LCP','home','fr','mobile',$2)",['v'+i,1000+i*500]);
  assert.equal(Number((await query("SELECT percentile_cont(0.75) WITHIN GROUP(ORDER BY value) AS p FROM imf_web_vitals")).rows[0].p),2125);
  await assert.rejects(()=>query("INSERT INTO imf_web_vitals(id,metric,route,locale,device,value) VALUES('invalid','LCP','/fr/client/secret','fr','mobile',100)"),/check constraint/i);
  const base={DATABASE_URL:'postgres://fixture@localhost/imf_test'};assert.equal(configuration({...base,PG_POOL_MAX:'2',PG_MAX_INSTANCES:'20',PG_CONNECTION_BUDGET:'60'}).max,2);assert.throws(()=>configuration({...base,PG_POOL_MAX:'3',PG_MAX_INSTANCES:'100'}),/budget/);assert.throws(()=>configuration({...base,PG_POOL_MAX:'NaN'}),/invalide/);
 }finally{await engine.close();}
 const {chunkStream}=require('../src/lib/media-stream.cjs');let calls=0;const payload=Buffer.alloc(800000,5);const reader=chunkStream(async(a,b)=>{calls++;return payload.subarray(a,b+1);},0,payload.length-1).getReader();assert.equal(calls,0);const first=await reader.read();assert.equal(first.value.length,262144);assert.equal(calls,1);await reader.cancel();assert.equal(calls,1,'Cancellation must not fetch remaining bytes');
 const partial=await new Response(chunkStream(async(a,b)=>payload.subarray(a,b+1),5,20)).arrayBuffer();assert.equal(partial.byteLength,16);
 // Exercise actual scheduler in a fake visibility environment, without WebGL.
 let frame,observer,visibility,cancelled=0,hidden=false,draws=0;
 const module={exports:{}};const code=ts.transpileModule(fs.readFileSync('src/components/site/visibility-loop.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,IntersectionObserver:class{constructor(cb){observer=cb;}observe(){}disconnect(){}},document:{get hidden(){return hidden;},addEventListener(_,cb){visibility=cb;},removeEventListener(){}},requestAnimationFrame:cb=>{frame=cb;return 1;},cancelAnimationFrame:()=>{frame=undefined;cancelled++;}});
 const stop=module.exports.visibilityLoop({},()=>draws++);assert.equal(frame,undefined);observer([{isIntersecting:true}]);frame(1);assert.equal(draws,1);observer([{isIntersecting:false}]);assert.equal(frame,undefined);hidden=true;observer([{isIntersecting:true}]);assert.equal(frame,undefined);hidden=false;visibility();frame(2);assert.equal(draws,2);stop();assert.equal(frame,undefined);assert(cancelled>=2);
 console.log('Quality: bounded CRM/search, aggregates, isolated CAS, pool budget, backpressure/cancellation and offscreen scheduler passed.');
})().catch(error=>{console.error(String(error));process.exitCode=1;});
