const fs=require('node:fs'),path=require('node:path');
const SCHEMA_VERSION=7;
async function migrate(client) {
 await client.query('BEGIN');
 try {
  await client.query('SELECT pg_advisory_xact_lock(834921)');
  await client.query('CREATE TABLE IF NOT EXISTS imf_schema_migrations(version integer PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())');
  const done=new Set((await client.query('SELECT version FROM imf_schema_migrations')).rows.map(row=>Number(row.version)));
  // Migration 4 once reset statuses in an old release; use the safe replacement.
  const files=['001-initial.sql','002-runtime.sql','003-rate-limits.sql','004-preserve-statuses.sql','005-audit-and-revisions.sql','006-integrity.sql','007-quality.sql'];
  for(const [index,file] of files.entries())if(!done.has(index+1))await client.query(fs.readFileSync(path.join(__dirname,'../database',file),'utf8'));
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}
}
module.exports={migrate,SCHEMA_VERSION};
