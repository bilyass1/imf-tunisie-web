const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),{randomBytes}=require('node:crypto'),bcrypt=require('bcryptjs');
function load(file){const module={exports:{}};const requireLocal=id=>id==='server-only'?{}:id.startsWith('.')?(id.endsWith('.json')?JSON.parse(fs.readFileSync(path.resolve(path.dirname(file),id))):load(path.resolve(path.dirname(file),id+'.ts'))):require(id);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(requireLocal,module,module.exports);return module.exports;}
async function setup(){
 const url=new URL(process.env.DATABASE_URL??'');if(!url.pathname.endsWith('_test')||!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('E2E requires an explicitly disposable localhost *_test database.');
 const {pool,importData}=require('../../scripts/postgres-common.cjs'),db=pool(),password=randomBytes(24).toString('base64url');
 try{
  const client=await db.connect();try{
   await require('../../scripts/migrations.cjs').migrate(client);
   if(Number((await client.query('SELECT count(*) AS count FROM imf_users')).rows[0].count)!==0)throw new Error('E2E database must be empty.');
   const seed=load(path.resolve('src/lib/seed.ts')).buildSeed();seed.contacts=[];seed.deals=[];seed.tasks=[];seed.activities=[];seed.uploads=[];
   const project=seed.projects[0],lot=project.lots[0],hash=await bcrypt.hash(password,12);
   seed.users=[{id:'e2e-admin',name:'Admin test',email:'admin@example.test',role:'admin',passwordHash:hash},{id:'e2e-client-a',name:'Client A',email:'a@example.test',role:'client',passwordHash:hash,projectSlug:project.slug,lotRef:lot.ref,properties:[{projectSlug:project.slug,lotRef:lot.ref}],documents:[],messages:[]},{id:'e2e-client-b',name:'Client B',email:'b@example.test',role:'client',passwordHash:hash,documents:[],messages:[]}];
   const id='aabbccdd-0000-4000-8000-000000000001';seed.users[1].documents.push({id,href:'/api/media/'+id,label:{fr:'Test',en:'Test',ar:'اختبار'},kind:'contract',date:'2026-10-16'});seed.uploads=[{id,clientId:seed.users[1].id,public:false,mime:'application/pdf',name:'fixture.pdf'}];
   await client.query('BEGIN');await importData(client,seed);await client.query('INSERT INTO imf_media(id,bytes) VALUES($1,$2)',[id,Buffer.from('%PDF-private-fixture')]);await client.query('UPDATE imf_revision SET revision=revision+1 WHERE id=1');await client.query('COMMIT');
   fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/e2e-fixture.json',JSON.stringify({password,id}),{mode:0o600});
  }finally{client.release();}
 }finally{await db.end();}
}
module.exports=setup;

if(require.main===module)setup().catch(error=>{console.error(error);process.exitCode=1;});
