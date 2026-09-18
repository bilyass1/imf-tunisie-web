const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'imf-storage-test-'));
const moduleBox={exports:{}};
const env={};
const code=ts.transpileModule(fs.readFileSync('src/lib/db.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const load=id=>id==='server-only'?{}:id==='./seed'?{buildSeed:()=>({users:[],projects:[],contacts:[],deals:[],tasks:[],activities:[]})}:id==='./yassamine-catalog'?{includeYassamineApartments:x=>x}:id==='./types'?{}:require(id);
try {
 vm.runInNewContext(code,{module:moduleBox,exports:moduleBox.exports,require:load,process:{cwd:()=>temp,env},structuredClone});
 const db=moduleBox.exports;
 const original=db.readDb();original.users.push({id:'client'});
 assert.equal(db.readDb().users.length,0);
 db.writeCommercialDb(original);assert.equal(db.readDb().users.length,1);
 env.VERCEL='1';assert.throws(()=>db.writeDb(original));delete env.VERCEL;
 fs.writeFileSync(path.join(temp,'data','db.json'),'invalid JSON');
 assert.throws(()=>db.readDb());
 console.log('PASS: isolated reads, durable writes, no serverless writes, corrupt data never replaced with demo records.');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
