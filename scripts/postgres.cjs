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
  if(command==='import'){
   if(!process.argv.includes('--confirm'))throw new Error('Import non lancé : ajoutez --confirm après vérification de la base cible.');
   const counts=await client.query('SELECT (SELECT count(*) FROM imf_users)+(SELECT count(*) FROM imf_projects)+(SELECT count(*) FROM imf_records) AS total');
   if(Number(counts.rows[0].total)!==0)throw new Error('La base cible contient déjà des données : import refusé.');
   await importData(client,JSON.parse(fs.readFileSync('data/db.json','utf8')));
  }
  await client.query('COMMIT');console.log(command==='import'?'Import transactionnel terminé. Le site utilise toujours son stockage local.':'Schéma PostgreSQL prêt.');
 }catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client?.release();await dbPool.end();}
})().catch(error=>{console.error(error.code?`Échec PostgreSQL (${error.code}). Vérifiez la configuration et les droits de la base.`:error.message);process.exitCode=1;});
