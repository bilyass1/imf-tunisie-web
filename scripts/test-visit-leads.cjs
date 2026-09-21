// Exercise actual CRM writes against disposable fixtures, never customer records.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'imf-visit-test-'));
const box={exports:{}};
const fixture=()=>({projects:[{slug:'test',lots:[{ref:'A1',code:'A 1',status:'available'},{ref:'A2',status:'sold'},{ref:'A3',status:'reserved'}]}],users:[],news:[],contacts:[],deals:[],activities:[],tasks:[]});
const localRequire=id=>id==='server-only'?{}:id==='next/cache'?{unstable_noStore(){}}:id==='./postgres-store.cjs'?{}:id==='./seed'?{buildSeed:fixture}:id==='./yassamine-catalog'?{includeYassamineApartments:x=>x}:id==='./types'?{}:require(id);
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/db.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module:box,exports:box.exports,require:localRequire,process:{cwd:()=>temp,env:{}},structuredClone});
(async()=>{try{
  const db=box.exports;
  const input={name:'Visit Test',email:'visit@example.test',phone:'+21600000000',projectSlug:'test',lotRef:'A 1',message:'Preferred visit',visit:{date:'2026-10-10',time:'10:30',mode:'video'}};
  const {deal}=await db.captureWebLead(input);
  assert.equal(deal.lotRef,'A1');
  const saved=await db.readDb();
  assert.equal(saved.contacts.length,1);assert.equal(saved.deals.length,1);assert.equal(saved.tasks.length,1);
  assert(saved.activities[0].body.includes('Visioconférence'));assert(saved.tasks[0].title.includes('2026-10-10 10:30'));
  assert.equal(saved.projects[0].lots[0].status,'available','A visit request must never reserve a property');
  for(const lotRef of ['A2','A3','MISSING'])await assert.rejects(()=>db.captureWebLead({...input,lotRef}),/VISIT_UNAVAILABLE/);
  const after=await db.readDb();assert.equal(after.deals.length,1);assert.equal(after.tasks.length,1);
  console.log('PASS: visit creates linked contact/deal/activity/task; sold, reserved and missing lots rejected without writes.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
