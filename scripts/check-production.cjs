const net=require('node:net'),tls=require('node:tls');
const fs=require('node:fs');
require('@next/env').loadEnvConfig(process.cwd());
const {pool}=require('./postgres-common.cjs');
async function antivirus(){
 if(!process.env.CLAMAV_HOST)throw new Error('CLAMAV_HOST manquant');
 await new Promise((resolve,reject)=>{const options={host:process.env.CLAMAV_HOST,port:Number(process.env.CLAMAV_PORT??3310)},socket=process.env.CLAMAV_TLS==='1'?tls.connect(options):net.connect(options);let text='';
 const finish=error=>{socket.destroy();error?reject(error):resolve();};socket.setTimeout(5000,()=>finish(new Error('Antivirus indisponible')));socket.once('error',()=>finish(new Error('Antivirus indisponible')));socket.once(process.env.CLAMAV_TLS==='1'?'secureConnect':'connect',()=>socket.write('zPING\0'));socket.on('data',chunk=>{text+=chunk;if(text.includes('PONG'))finish();else if(text.length>100)finish(new Error('Réponse antivirus incorrecte'));});socket.once('end',()=>{if(!text.includes('PONG'))finish(new Error('Antivirus indisponible'));});});
}
(async()=>{
 for(const key of ['DATABASE_URL','AUTH_SECRET','APP_ORIGIN','TRUSTED_CLIENT_IP_HEADER','CLAMAV_HOST'])if(!process.env[key])throw new Error('Variable obligatoire manquante : '+key);
 if(process.env.AUTH_SECRET.length<32||process.env.AUTH_SECRET.startsWith('changez-'))throw new Error('AUTH_SECRET non sécurisé');
 if(new URL(process.env.APP_ORIGIN).protocol!=='https:')throw new Error('APP_ORIGIN exige HTTPS en production');
 const db=pool();try{
 const version=(await db.query('SELECT max(version)::int AS version FROM imf_schema_migrations')).rows[0].version;if(version!==6)throw new Error('Migrations non appliquées');
 const role=(await db.query("SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user")).rows[0];
 if(role.rolsuper||role.rolcreatedb||role.rolcreaterole)throw new Error('Compte PostgreSQL runtime trop privilégié');
 const rights=(await db.query("SELECT has_schema_privilege(current_user,'public','CREATE') AS create_schema,EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tableowner=current_user) AS owns_tables")).rows[0];
 if(rights.create_schema||rights.owns_tables)throw new Error('Le compte runtime ne doit ni créer ni posséder les tables');
 if(!(await db.query('SELECT 1 FROM imf_passkeys LIMIT 1')).rows.length)throw new Error('Inscription d’au moins une clé administrateur requise avant ouverture publique');
 await antivirus();
 const evidenceFile=process.env.RELEASE_EVIDENCE_FILE;if(!evidenceFile)throw new Error('RELEASE_EVIDENCE_FILE manquant : preuves de mise en production non fournies');
 const evidence=JSON.parse(fs.readFileSync(evidenceFile,'utf8')),missing=Object.entries(evidence).filter(([,value])=>typeof value==='boolean'&&!value).map(([key])=>key);
 if(missing.length||!evidence.owner||evidence.owner==='TO_FILL'||!evidence.evidenceReferences?.length)throw new Error('Preuves de mise en production incomplètes : '+missing.join(', '));
 console.log('PASS: configuration, schéma, rôle runtime et antivirus. Sauvegarde/restauration et contrôles d’hébergement restent à attester dans le registre de mise en production.');
 }finally{await db.end();}
})().catch(error=>{console.error(error.code?'Contrôle production échoué ('+error.code+')':error.message);process.exitCode=1;});
