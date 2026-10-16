// SQL smoke benchmark on synthetic data in an explicitly disposable local database.
// Everything inserted below is rolled back. This is NOT a concurrent-user capacity test.
const fs=require('node:fs'),{performance}=require('node:perf_hooks');
const {pool}=require('./postgres-common.cjs'),{createStore}=require('../src/lib/postgres-store.cjs');
(async()=>{
 const url=new URL(process.env.DATABASE_URL??'');if(!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_test'))throw new Error('Benchmark requires a disposable localhost *_test database.');
 const db=pool(),client=await db.connect();
 try{
  await client.query('BEGIN');
  await client.query("INSERT INTO imf_projects(slug,data) VALUES('quality-benchmark',$1)",[{name:'Synthetic project',city:'Test',address:{fr:'Synthetic',en:'Synthetic',ar:'اختبار'},cover:'/fixture.webp',mapQuery:'Synthetic'}]);
  await client.query(`INSERT INTO imf_lots(project_slug,ref,status,data) SELECT 'quality-benchmark','lot-'||lpad(n::text,5,'0'),'available',jsonb_build_object('code','lot-'||n,'typology','S+2','floor',1,'sellableArea',60+n%100,'price',100000+n) FROM generate_series(1,1000) n`);
  await client.query(`INSERT INTO imf_users(id,email,role,password_hash,data) SELECT 'quality-user-'||n,'quality-fixture-'||n||'@example.test','client','not-a-bcrypt-hash',jsonb_build_object('name','Synthetic account') FROM generate_series(1,1000) n`);
  await client.query(`INSERT INTO imf_messages(client_id,id,sender,sent_at,body) SELECT 'quality-user-'||(1+n%1000),'quality-message-'||n,'client',now(),'Synthetic fixture' FROM generate_series(1,10000) n`);
  await client.query(`INSERT INTO imf_records(collection,id,position,data)
   SELECT c,'quality-'||c||'-'||lpad(n::text,6,'0'),0,jsonb_build_object('id','quality-'||c||'-'||lpad(n::text,6,'0'),'name','Synthetic contact','phone','000','source','website','tags','[]'::jsonb,'createdAt','2026-10-16','contactId','quality-contacts-'||lpad(n::text,6,'0'),'title','Synthetic opportunity','stage','new','value',100,'probability',10,'date','2026-10-16','body','Synthetic activity','type','note','done',false,'dueDate','2026-01-01')
   FROM unnest(ARRAY['contacts','deals','tasks','activities']) c CROSS JOIN generate_series(1,10000) n`);
  const store=createStore({query:(...args)=>client.query(...args)});
  const filters={q:'',city:'',project:'quality-benchmark',status:'available',bedrooms:'',minPrice:'',maxPrice:'',minArea:'',maxArea:'',sort:'reference'};
  const operations={dashboard:()=>store.crmDashboard(),contacts:()=>store.crmList('contacts',{limit:30}),search:()=>store.searchProperties(filters,'fr',1)};
  const results={};
  for(const [name,run] of Object.entries(operations)){
   await run();const durations=[];let bytes=0;
   for(let i=0;i<10;i++){const started=performance.now(),value=await run();durations.push(performance.now()-started);bytes=Math.max(bytes,Buffer.byteLength(JSON.stringify(value)));if(name==='contacts'&&value.items.length>30||name==='search'&&value.items.length>24||name==='dashboard'&&(value.activities.length>8||value.tasks.length>6))throw new Error('Unbounded result');}
   durations.sort((a,b)=>a-b);results[name]={runs:10,p50Ms:Number(durations[4].toFixed(2)),p95Ms:Number(durations[9].toFixed(2)),maxResponseBytes:bytes};
  }
  const report={kind:'single-connection SQL smoke; not user capacity or production latency',fixture:{contacts:10000,deals:10000,tasks:10000,activities:10000,lots:1000,users:1000,messages:10000},results};
  fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/sql-quality.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await client.query('ROLLBACK').catch(()=>{});client.release();await db.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
