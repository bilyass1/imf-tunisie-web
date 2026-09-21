// Shared by the Next.js server and integration tests. Never imported by client components.
const { Pool } = require('pg');
const fs = require('node:fs');

function configuration(env = process.env) {
  const raw = env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL doit être configurée.');
  const url = new URL(raw);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('URL PostgreSQL invalide.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const mode = url.searchParams.get('sslmode');
  if (mode && !['require', 'verify-full', 'verify-ca'].includes(mode)) throw new Error('Une connexion PostgreSQL vérifiée est requise.');
  for (const key of ['sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat']) {
    if (url.searchParams.has(key)) throw new Error('Utilisez PG_SSL_CA_FILE pour le certificat PostgreSQL.');
  }
  // Provider URLs often contain sslmode=require. Always verify the certificate.
  url.searchParams.delete('sslmode');
  return { connectionString: url.toString(), max: 3, connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000, statement_timeout: 30000, allowExitOnIdle: true,
    ssl: local ? false : { rejectUnauthorized: true, ...(env.PG_SSL_CA_FILE ? { ca: fs.readFileSync(env.PG_SSL_CA_FILE, 'utf8') } : {}) } };
}

const collections = ['news', 'contacts', 'deals', 'activities', 'tasks', 'uploads'];
// Identifiers below are fixed application constants, never values supplied by a user.
const tables = [
  ['imf_projects', ['slug'], ['slug','data']],
  ['imf_lots', ['project_slug','ref'], ['project_slug','ref','status','data']],
  ['imf_users', ['id'], ['id','email','role','password_hash','auth_version','project_slug','lot_ref','data']],
  ['imf_messages', ['client_id','id'], ['client_id','id','sender','sent_at','body']],
  ['imf_documents', ['client_id','id'], ['client_id','id','archived','data']],
  ['imf_records', ['collection','id'], ['collection','id','position','data']],
];
let schemaReady;
async function ensureSchema(pool) {
  if (!schemaReady) schemaReady = (async () => {
    const statements = [`
    CREATE TABLE IF NOT EXISTS imf_schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS imf_projects (slug text PRIMARY KEY, data jsonb NOT NULL);
    CREATE TABLE IF NOT EXISTS imf_lots (project_slug text NOT NULL REFERENCES imf_projects(slug), ref text NOT NULL, status text NOT NULL, data jsonb NOT NULL, PRIMARY KEY(project_slug,ref));
    CREATE TABLE IF NOT EXISTS imf_users (id text PRIMARY KEY, email text NOT NULL, role text NOT NULL, password_hash text NOT NULL, auth_version integer NOT NULL DEFAULT 0, project_slug text, lot_ref text, data jsonb NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS imf_users_email_unique ON imf_users(lower(email));
    CREATE UNIQUE INDEX IF NOT EXISTS imf_client_lot_unique ON imf_users(project_slug,lot_ref) WHERE role='client';
    CREATE TABLE IF NOT EXISTS imf_messages (client_id text NOT NULL REFERENCES imf_users(id), id text NOT NULL, sender text NOT NULL, sent_at timestamptz NOT NULL, body text NOT NULL, PRIMARY KEY(client_id,id));
    CREATE TABLE IF NOT EXISTS imf_documents (client_id text NOT NULL REFERENCES imf_users(id), id text NOT NULL, archived boolean NOT NULL DEFAULT false, data jsonb NOT NULL, PRIMARY KEY(client_id,id));
    CREATE TABLE IF NOT EXISTS imf_records (collection text NOT NULL, id text NOT NULL, position integer NOT NULL, data jsonb NOT NULL, PRIMARY KEY(collection,id));
    CREATE TABLE IF NOT EXISTS imf_revision (id integer PRIMARY KEY CHECK(id=1), revision bigint NOT NULL DEFAULT 0);
    INSERT INTO imf_revision(id) VALUES(1) ON CONFLICT DO NOTHING;
    CREATE TABLE IF NOT EXISTS imf_media (id text PRIMARY KEY, bytes bytea NOT NULL CHECK(octet_length(bytes) BETWEEN 1 AND 8388608));
    INSERT INTO imf_schema_migrations(version) VALUES(1),(2) ON CONFLICT DO NOTHING;
    `];
    for (const statement of statements[0].split(';').map(s => s.trim()).filter(Boolean)) await pool.query(statement);
  })();
  await schemaReady;
}
function flatten(db) {
  const result = Object.fromEntries(tables.map(([table]) => [table, new Map()]));
  const add = (table, row) => {
    const keys = tables.find(t => t[0] === table)[1];
    const key = JSON.stringify(keys.map(k => row[k]));
    if (result[table].has(key)) throw new Error('Enregistrement dupliqué.');
    result[table].set(key, row);
  };
  for (const project of db.projects) {
    const {lots, ...data} = project;
    add('imf_projects', {slug:project.slug, data});
    for (const lot of lots) add('imf_lots', {project_slug:project.slug, ref:lot.ref, status:lot.status, data:lot});
  }
  for (const user of db.users) {
    const {passwordHash, authVersion, documents, archivedDocuments, messages, ...data} = user;
    add('imf_users', {id:user.id, email:user.email, role:user.role, password_hash:passwordHash,
      auth_version:authVersion??0, project_slug:user.projectSlug??null, lot_ref:user.lotRef??null, data});
    for (const message of messages??[]) add('imf_messages', {client_id:user.id, id:message.id,
      sender:message.from, sent_at:new Date(message.date).toISOString(), body:message.body});
    for (const [list, archived] of [[documents,false],[archivedDocuments,true]]) {
      for (const doc of list??[]) add('imf_documents', {client_id:user.id, id:doc.id, archived, data:doc});
    }
  }
  for (const collection of collections) for (const [position,data] of (db[collection]??[]).entries()) {
    add('imf_records', {collection, id:data.id??data.slug, position, data});
  }
  if (db.company) add('imf_records', {collection:'settings', id:'company', position:0, data:db.company});
  return result;
}
async function bootstrapIfEmpty(pool, seedFactory) {
  const check = await pool.query('SELECT 1 FROM imf_projects LIMIT 1');
  if (check.rows.length) return;
  if (typeof seedFactory !== 'function') return;
  const rows = flatten(seedFactory());
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const again = await client.query('SELECT 1 FROM imf_projects LIMIT 1');
    if (!again.rows.length) {
      for (const [table, keys, columns] of tables) {
        for (const [, row] of rows[table]) {
          await client.query(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map((_,i)=>`$${i+1}`).join(',')}) ON CONFLICT DO NOTHING`, columns.map(k=>row[k]));
        }
      }
      await client.query('UPDATE imf_revision SET revision=1 WHERE id=1');
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK').catch(()=>{}); throw error; }
  finally { client.release(); }
}
function createStore(pool, seedFactory) {
  const snapshots = new WeakMap();
  let bootstrapReady;
  let cache;
  let publicCache;
  let publicRead;
  let publicVersion = 0;
  async function readPublic() {
    await ensureSchema(pool);
    if (!bootstrapReady) bootstrapReady = bootstrapIfEmpty(pool, seedFactory);
    await bootstrapReady;
    if (publicCache && publicCache.expiresAt > Date.now()) return structuredClone(publicCache.data);
    if (publicRead) return structuredClone(await publicRead);
    const version = publicVersion;
    const operation = (async () => {
      // A single statement provides one consistent snapshot without loading
      // accounts, messages, documents, contacts or optimistic-write snapshots.
      const result = await pool.query(`SELECT
        (SELECT COALESCE(jsonb_agg(data || jsonb_build_object('slug',slug) ORDER BY slug),'[]'::jsonb) FROM imf_projects) AS projects,
        (SELECT COALESCE(jsonb_agg(jsonb_build_object('project',project_slug,'lot',data || jsonb_build_object('ref',ref,'status',status)) ORDER BY project_slug,ref),'[]'::jsonb) FROM imf_lots) AS lots,
        (SELECT COALESCE(jsonb_agg(data ORDER BY position,id),'[]'::jsonb) FROM imf_records WHERE collection='news') AS news,
        (SELECT data FROM imf_records WHERE collection='settings' AND id='company') AS company`);
      const row = result.rows[0];
      if (!row?.projects?.length) throw new Error('Import initial PostgreSQL requis.');
      const projects = row.projects.map(p => ({...p,lots:[]}));
      const bySlug = new Map(projects.map(p => [p.slug,p]));
      for (const entry of row.lots) bySlug.get(entry.project)?.lots.push(entry.lot);
      const data = {projects,news:row.news,company:row.company ?? undefined};
      if (version === publicVersion) publicCache = {data,expiresAt:Date.now()+5000};
      return data;
    })();
    publicRead = operation;
    try { return structuredClone(await operation); }
    finally { if (publicRead === operation) publicRead = undefined; }
  }
  async function read() {
    await ensureSchema(pool);
    if (!bootstrapReady) bootstrapReady = bootstrapIfEmpty(pool, seedFactory);
    await bootstrapReady;
    if (cache && cache.expiresAt > Date.now()) {
      const data = structuredClone(cache.data);
      snapshots.set(data,{revision:cache.revision,rows:flatten(data)});
      return data;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const revision = await client.query('SELECT revision FROM imf_revision WHERE id=1');
      const data = {projects:[], users:[], news:[], contacts:[], deals:[], activities:[], tasks:[], uploads:[]};
      const projects = await client.query('SELECT slug,data FROM imf_projects ORDER BY slug');
      if (!projects.rows.length || !revision.rows.length) throw new Error('Import initial PostgreSQL requis.');
      const projectMap = new Map();
      for (const row of projects.rows) { const p={...row.data,slug:row.slug,lots:[]}; data.projects.push(p); projectMap.set(row.slug,p); }
      for (const row of (await client.query('SELECT * FROM imf_lots ORDER BY project_slug,ref')).rows) {
        projectMap.get(row.project_slug).lots.push({...row.data,ref:row.ref,status:row.status});
      }
      const userMap = new Map();
      for (const row of (await client.query('SELECT * FROM imf_users ORDER BY id')).rows) {
        const u={...row.data,id:row.id,email:row.email,role:row.role,passwordHash:row.password_hash,
          authVersion:row.auth_version,projectSlug:row.project_slug??undefined,lotRef:row.lot_ref??undefined,
          documents:[],archivedDocuments:[],messages:[]};
        data.users.push(u); userMap.set(u.id,u);
      }
      for (const row of (await client.query('SELECT * FROM imf_messages ORDER BY sent_at,id')).rows) {
        userMap.get(row.client_id).messages.push({id:row.id,from:row.sender,date:new Date(row.sent_at).toISOString(),body:row.body});
      }
      for (const row of (await client.query('SELECT * FROM imf_documents ORDER BY id')).rows) {
        userMap.get(row.client_id)[row.archived?'archivedDocuments':'documents'].push(row.data);
      }
      for (const row of (await client.query('SELECT * FROM imf_records ORDER BY collection,position,id')).rows) {
        if (row.collection==='settings' && row.id==='company') data.company=row.data;
        else if (collections.includes(row.collection)) data[row.collection].push(row.data);
      }
      await client.query('COMMIT');
      const currentRevision=String(revision.rows[0].revision);
      cache={data:structuredClone(data),revision:currentRevision,expiresAt:Date.now()+5000};
      snapshots.set(data,{revision:currentRevision, rows:flatten(data)});
      return data;
    } catch(error) { await client.query('ROLLBACK').catch(()=>{}); throw error; }
    finally { client.release(); }
  }
  async function write(data, media) {
    await ensureSchema(pool);
    const snapshot=snapshots.get(data);
    if (!snapshot) throw new Error('Rechargez les données avant de les modifier.');
    const next=flatten(data);
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      const version=await client.query('SELECT revision FROM imf_revision WHERE id=1 FOR UPDATE');
      if (String(version.rows[0]?.revision)!==snapshot.revision) throw new Error('Un autre utilisateur vient de modifier les données. Réessayez.');
      for (const [table,keys] of [...tables].reverse()) {
        for (const [key,row] of snapshot.rows[table]) if (!next[table].has(key)) {
          await client.query(`DELETE FROM ${table} WHERE ${keys.map((k,i)=>`${k}=$${i+1}`).join(' AND ')}`, keys.map(k=>row[k]));
        }
      }
      for (const [table,keys,columns] of tables) {
        for (const [key,row] of next[table]) if (JSON.stringify(snapshot.rows[table].get(key))!==JSON.stringify(row)) {
          await client.query(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map((_,i)=>`$${i+1}`).join(',')}) ON CONFLICT(${keys.join(',')}) DO UPDATE SET ${columns.filter(k=>!keys.includes(k)).map(k=>`${k}=EXCLUDED.${k}`).join(',')}`,columns.map(k=>row[k]));
        }
      }
      if (media) {
        if (!data.uploads?.some(u=>u.id===media.id)) throw new Error('Métadonnées du fichier manquantes.');
        await client.query('INSERT INTO imf_media(id,bytes) VALUES($1,$2)',[media.id,media.bytes]);
      }
      const updated=await client.query('UPDATE imf_revision SET revision=revision+1 WHERE id=1 RETURNING revision');
      await client.query('COMMIT');
      cache=undefined;
      publicVersion++;
      publicCache=undefined;
      publicRead=undefined;
      snapshots.set(data,{revision:String(updated.rows[0].revision),rows:next});
    } catch(error) { await client.query('ROLLBACK').catch(()=>{}); throw error; }
    finally { client.release(); }
  }
  async function readMedia(id) {
    await ensureSchema(pool);
    const result=await pool.query('SELECT bytes FROM imf_media WHERE id=$1',[id]);
    return result.rows[0]?.bytes;
  }
  return {read,readPublic,write,readMedia};
}
let store;
function getStore(seedFactory) {
  if (!store) {
    const pool=new Pool(configuration());
    if (process.env.VERCEL) require('@vercel/functions').attachDatabasePool(pool);
    pool.on('error',()=>console.error('PostgreSQL: connexion inactive interrompue.'));
    store=createStore(pool, seedFactory);
  }
  return store;
}
module.exports={configuration,createStore,getStore};
