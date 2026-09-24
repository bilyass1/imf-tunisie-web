const fs=require('node:fs');const path=require('node:path');
require('@next/env').loadEnvConfig(process.cwd());
const {pool,rows,importData}=require('./postgres-common.cjs');
const command=process.argv[2]??'check';
(async()=>{
 if(command==='validate'){const db=rows(JSON.parse(fs.readFileSync('data/db.json','utf8')));console.log(`Validation : ${db.projects.length} résidences, ${db.users.length} comptes. Aucun transfert effectué.`);return;}
 if(!['check','migrate','import'].includes(command))throw new Error('Commande inconnue.');
 const dbPool=pool();let client;
 try{
  client=await dbPool.connect();
  if(command==='check'){await client.query('SELECT 1');console.log('Connexion PostgreSQL réussie.');return;}
  await client.query('BEGIN');await client.query("SELECT pg_advisory_xact_lock(834921)");
  await client.query(fs.readFileSync(path.join(__dirname,'../database/001-initial.sql'),'utf8'));
  await client.query(fs.readFileSync(path.join(__dirname,'../database/002-runtime.sql'),'utf8'));
  await client.query(fs.readFileSync(path.join(__dirname,'../database/003-rate-limits.sql'),'utf8'));
  if(command==='import'){
   if(!process.argv.includes('--confirm'))throw new Error('Import non lancé : ajoutez --confirm après vérification de la base cible.');
   const counts=await client.query('SELECT (SELECT count(*) FROM imf_users)+(SELECT count(*) FROM imf_projects)+(SELECT count(*) FROM imf_records) AS total');
   if(Number(counts.rows[0].total)!==0)throw new Error('La base cible contient déjà des données : import refusé.');
   const source=JSON.parse(fs.readFileSync('data/db.json','utf8'));
   await importData(client,source);
   for(const upload of source.uploads??[]){
    if(!/^[a-f0-9-]{36}$/.test(upload.id))throw new Error('Identifiant de fichier invalide.');
    const bytes=fs.readFileSync(path.join('data','uploads',upload.id));
    if(bytes.length>3*1024*1024)throw new Error('Un fichier dépasse la limite de démonstration de 3 Mo.');
    await client.query('INSERT INTO imf_media(id,bytes) VALUES($1,$2)',[upload.id,bytes]);
   }
   await client.query('UPDATE imf_revision SET revision=revision+1 WHERE id=1');
  }
  await client.query('COMMIT');console.log(command==='import'?'Import PostgreSQL et fichiers terminé. DATABASE_URL active ce stockage dans le site.':'Schéma PostgreSQL prêt.');
 }catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client?.release();await dbPool.end();}
})().catch(error=>{console.error(error.code?`Échec PostgreSQL (${error.code}). Vérifiez la configuration et les droits de la base.`:error.message);process.exitCode=1;});
