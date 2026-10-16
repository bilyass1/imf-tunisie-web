require('@next/env').loadEnvConfig(process.cwd());
const {pool}=require('./postgres-common.cjs'),objects=require('../src/lib/object-media.cjs');
const {createHash}=require('node:crypto');
(async()=>{
 const db=pool();try{
  if(process.argv[2]==='migrate'){
   if(!process.argv.includes('--confirm'))throw new Error('Migration non lancée : ajoutez --confirm. Les blobs PostgreSQL sont conservés.');
   const ids=(await db.query('SELECT id FROM imf_media WHERE id NOT IN(SELECT id FROM imf_media_objects) ORDER BY id')).rows;
   for(const {id} of ids){
    const bytes=(await db.query('SELECT bytes FROM imf_media WHERE id=$1',[id])).rows[0].bytes,object=await objects.put(id,bytes);
    const copied=await objects.read(object.key);if(createHash('sha256').update(copied).digest('hex')!==object.sha256)throw new Error('Copie non conforme');
    await db.query('INSERT INTO imf_media_objects(id,object_key,size,sha256) VALUES($1,$2,$3,$4)',[id,object.key,object.size,object.sha256]);
   }
   console.log('Migration vérifiée ; originaux PostgreSQL conservés.');
  }else if(process.argv[2]==='cleanup')await objects.drain(db);
  else throw new Error('Commande attendue : migrate --confirm ou cleanup.');
 }finally{await db.end();}
})().catch(error=>{console.error(error.code?'Opération média échouée ('+error.code+')':error.message);process.exitCode=1;});
