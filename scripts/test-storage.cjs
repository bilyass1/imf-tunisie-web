const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'imf-storage-test-'));
const moduleBox={exports:{}};
const env={};
const code=ts.transpileModule(fs.readFileSync('src/lib/db.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const load=id=>id==='server-only'?{}:id==='next/cache'?{unstable_noStore:()=>{}}:id==='./postgres-store.cjs'?{}:id==='./seed'?{buildSeed:()=>({users:[],projects:[],contacts:[],deals:[],tasks:[],activities:[]})}:id==='./yassamine-catalog'?{includeYassamineApartments:x=>x}:id==='./yassamine-a5b'?{includeYassamineA5bLots:x=>x}:id==='./yassamine-a6'?{includeYassamineA6Lots:x=>x}:id==='./project-presentation'?{projectPresentation:x=>x}:id==='./types'?{}:require(id);
(async()=>{try {
 vm.runInNewContext(code,{module:moduleBox,exports:moduleBox.exports,require:load,process:{cwd:()=>temp,env},structuredClone});
 const db=moduleBox.exports;
 const original=await db.readDb();original.users.push({id:'client'});
 const stale=await db.readDb();
 assert.equal((await db.readDb()).users.length,0);
 await db.writeCommercialDb(original);assert.equal((await db.readDb()).users.length,1);
 await assert.rejects(()=>db.writeDb(stale));
 env.VERCEL='1';await assert.rejects(()=>db.writeDb(original));delete env.VERCEL;
 fs.writeFileSync(path.join(temp,'data','db.json'),'invalid JSON');
 await assert.rejects(()=>db.readDb());
 console.log('PASS: isolated reads, durable writes, no serverless writes, corrupt data never replaced with demo records.');
} finally {fs.rmSync(temp,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
