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
  const integer=(name,fallback,min,max)=>{const value=env[name]===undefined?fallback:Number(env[name]);if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error(`Configuration ${name} invalide.`);return value;};
  const max=integer('PG_POOL_MAX',3,1,20),instances=integer('PG_MAX_INSTANCES',1,1,10000);
  const budget=integer('PG_CONNECTION_BUDGET',100,2,100000),reserve=integer('PG_CONNECTION_RESERVE',20,1,99999);
  if(max*instances>budget-reserve)throw new Error('Le budget global PostgreSQL est dépassé. Réduisez le pool/la concurrence ou configurez un pooler.');
  return { connectionString: url.toString(), max, connectionTimeoutMillis: integer('PG_CONNECT_TIMEOUT_MS',5000,100,30000),
    idleTimeoutMillis: 10000, statement_timeout: 15000, idle_in_transaction_session_timeout: 15000, application_name: 'imf-web', allowExitOnIdle: true,
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
const validatedPools=new WeakMap();
async function ensureSchema(pool) {
 if(!validatedPools.has(pool)) validatedPools.set(pool,(async()=>{
  const result=await pool.query('SELECT max(version)::int AS version FROM imf_schema_migrations');
  if(result.rows[0]?.version!==7) throw new Error('Schéma PostgreSQL incompatible. Exécutez npm run db:migrate avec le compte de migration avant le démarrage.');
  const expected=['imf_users_role_valid','imf_users_auth_version_valid','imf_users_property_fk','imf_projects_data_object','imf_messages_sender_valid','imf_messages_body_valid','imf_records_collection_valid','imf_client_property_assignments_pkey'];
  const constraints=(await pool.query('SELECT conname FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND conname=ANY($1::text[])',[expected])).rows;
  if(constraints.length!==expected.length)throw new Error('Contraintes PostgreSQL incomplètes. Vérifiez les migrations.');
 })().catch(error=>{validatedPools.delete(pool);throw error;}));
 await validatedPools.get(pool);
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
function createStore(pool, _seedFactory) {
  const snapshots = new WeakMap();

  let cache;
  let publicCache;
  let publicRead;
  let publicVersion = 0;
  async function consumeRateLimit(key, limit, windowMs, now = Date.now()) {
    await ensureSchema(pool);
    const result = await pool.query(`INSERT INTO imf_rate_limits(key,count,expires_at)
      VALUES($1,1,$2::timestamptz)
      ON CONFLICT(key) DO UPDATE SET
        count=CASE WHEN imf_rate_limits.expires_at <= $3::timestamptz THEN 1 ELSE imf_rate_limits.count+1 END,
        expires_at=CASE WHEN imf_rate_limits.expires_at <= $3::timestamptz THEN $2::timestamptz ELSE imf_rate_limits.expires_at END
      RETURNING count <= $4 AS allowed`, [key,new Date(now+windowMs).toISOString(),new Date(now).toISOString(),limit]);
    // Cleanup is deliberately occasional; the write above remains atomic across instances.
    if (Math.random() < 0.01) await pool.query('DELETE FROM imf_rate_limits WHERE expires_at < $1::timestamptz', [new Date(now-86400000).toISOString()]).catch(()=>{});
    return result.rows[0].allowed;
  }
  async function readAuthUser(field, value) {
    await ensureSchema(pool);

    const where = field === 'id' ? 'id=$1' : 'lower(email)=lower($1)';
    const result = await pool.query(`SELECT id,email,role,password_hash,auth_version,data->>'name' AS name
      FROM imf_users WHERE ${where} LIMIT 1`, [value]);
    const row = result.rows[0];
    return row && {id:row.id,email:row.email,role:row.role,passwordHash:row.password_hash,
      authVersion:row.auth_version,name:row.name};
  }
  async function readUserById(id) {
    await ensureSchema(pool);

    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const result = await client.query('SELECT * FROM imf_users WHERE id=$1 LIMIT 1', [id]);
      const row = result.rows[0];
      if (!row) { await client.query('COMMIT'); return undefined; }
      const user = {...row.data,id:row.id,email:row.email,role:row.role,passwordHash:row.password_hash,
        authVersion:row.auth_version,projectSlug:row.project_slug??undefined,lotRef:row.lot_ref??undefined,
        messages:[],documents:[],archivedDocuments:[]};
      for (const message of (await client.query('SELECT * FROM imf_messages WHERE client_id=$1 ORDER BY sent_at,id', [id])).rows) {
        user.messages.push({id:message.id,from:message.sender,date:new Date(message.sent_at).toISOString(),body:message.body});
      }
      for (const document of (await client.query('SELECT archived,data FROM imf_documents WHERE client_id=$1 ORDER BY id', [id])).rows) {
        user[document.archived?'archivedDocuments':'documents'].push(document.data);
      }
      await client.query('COMMIT');
      return user;
    } catch(error) { await client.query('ROLLBACK').catch(()=>{}); throw error; }
    finally { client.release(); }
  }
  async function revision() {
    await ensureSchema(pool);

    const result = await pool.query('SELECT revision FROM imf_revision WHERE id=1');
    if (!result.rows.length) throw new Error('Import initial PostgreSQL requis.');
    return String(result.rows[0].revision);
  }
  async function publicRevision() {await ensureSchema(pool);return String((await pool.query('SELECT revision FROM imf_public_revision WHERE id=1')).rows[0].revision);}
  async function clientRevision(id) {await ensureSchema(pool);const row=(await pool.query('SELECT (SELECT revision FROM imf_public_revision WHERE id=1)::text AS public,COALESCE((SELECT revision FROM imf_client_revisions WHERE client_id=$1),0)::text AS private',[id])).rows[0];return row.public+'-'+row.private;}
  async function readPublic() {
    // Vercel runs admin actions and public pages in different instances. A
    // process-local TTL alone can show a sold lot as available after a write.
    const currentRevision = await publicRevision();
    if (publicCache?.revision === currentRevision) return structuredClone(publicCache.data);
    if (publicRead?.revision === currentRevision) return structuredClone(await publicRead.promise);
    const version = publicVersion;
    const operation = (async () => {
      // A single statement provides one consistent snapshot without loading
      // accounts, messages, documents, contacts or optimistic-write snapshots.
      const result = await pool.query(`SELECT
        (SELECT COALESCE(jsonb_agg(data || jsonb_build_object('slug',slug) ORDER BY slug),'[]'::jsonb) FROM imf_projects) AS projects,
        (SELECT COALESCE(jsonb_agg(jsonb_build_object('project',project_slug,'lot',(data - 'reservationNote' - 'planDwgUrl') || jsonb_build_object('ref',ref,'status',status)) ORDER BY project_slug,ref),'[]'::jsonb) FROM imf_lots) AS lots,
        (SELECT COALESCE(jsonb_agg(data ORDER BY position,id),'[]'::jsonb) FROM imf_records WHERE collection='news') AS news,
        (SELECT data FROM imf_records WHERE collection='settings' AND id='company') AS company,
        (SELECT revision FROM imf_public_revision WHERE id=1) AS revision`);
      const row = result.rows[0];
      if (!row?.projects?.length) throw new Error('Import initial PostgreSQL requis.');
      const projects = row.projects.map(p => ({...p,lots:[]}));
      const bySlug = new Map(projects.map(p => [p.slug,p]));
      for (const entry of row.lots) bySlug.get(entry.project)?.lots.push(entry.lot);
      const data = {projects,news:row.news,company:row.company ?? undefined};
      if (version === publicVersion && (!publicCache || BigInt(row.revision) >= BigInt(publicCache.revision))) {
        publicCache = {data,revision:String(row.revision)};
      }
      return data;
    })();
    publicRead = {revision:currentRevision,promise:operation};
    try { return structuredClone(await operation); }
    finally { if (publicRead?.promise === operation) publicRead = undefined; }
  }
  async function read() {
    await ensureSchema(pool);

    if (cache && cache.revision === await revision()) {
      const data = structuredClone(cache.data);
      snapshots.set(data,{revision:cache.revision,rows:flatten(structuredClone(data)),original:structuredClone(data)});
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
      cache={data:structuredClone(data),revision:currentRevision};
      snapshots.set(data,{revision:currentRevision, rows:flatten(structuredClone(data)),original:structuredClone(data)});
      return data;
    } catch(error) { await client.query('ROLLBACK').catch(()=>{}); throw error; }
    finally { client.release(); }
  }
  async function write(data, media, audit) {
    await ensureSchema(pool);
    const snapshot=snapshots.get(data);
    if (!snapshot) throw new Error('Rechargez les données avant de les modifier.');
    const next=flatten(data);
    const removedMediaIds=[...snapshot.rows.imf_records.entries()]
      .filter(([key,row])=>row.collection==='uploads' && !next.imf_records.has(key) && /^[a-f0-9-]{36}$/.test(row.id))
      .map(([,row])=>row.id);
    let object;
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      for(const [table,keys,columns] of tables) {
        const changed=[...snapshot.rows[table].entries()].filter(([key,row])=>JSON.stringify(row)!==JSON.stringify(next[table].get(key))).sort(([a],[b])=>a.localeCompare(b));
        for(const [,row] of changed) {
          const current=(await client.query(`SELECT ${columns.join(',')} FROM ${table} WHERE ${keys.map((k,i)=>`${k}=$${i+1}`).join(' AND ')} FOR UPDATE`,keys.map(k=>row[k]))).rows[0];
          const canonical=value=>value instanceof Date?value.toISOString():Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
          const normalize=value=>JSON.stringify(canonical(value));
          if(!current || columns.some(column=>normalize(current[column])!==normalize(row[column]))) throw new Error('Un autre utilisateur vient de modifier cet enregistrement. Réessayez.');
        }
      }
      for (const [table,keys] of [...tables].reverse()) {
        for (const [key,row] of snapshot.rows[table]) if (!next[table].has(key)) {
          await client.query(`DELETE FROM ${table} WHERE ${keys.map((k,i)=>`${k}=$${i+1}`).join(' AND ')}`, keys.map(k=>row[k]));
        }
      }
      for (const [table,keys,columns] of tables) {
        for (const [key,row] of next[table]) if (JSON.stringify(snapshot.rows[table].get(key))!==JSON.stringify(row)) {
          await client.query(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map((_,i)=>`$${i+1}`).join(',')}) ${snapshot.rows[table].has(key)?`ON CONFLICT(${keys.join(',')}) DO UPDATE SET ${columns.filter(k=>!keys.includes(k)).map(k=>`${k}=EXCLUDED.${k}`).join(',')}`:''}`,columns.map(k=>row[k]));
        }
      }
      if (media) {
        if(process.env.MEDIA_S3_BUCKET)object=await require('./object-media.cjs').put(media.id,media.bytes);
        if (!data.uploads?.some(u=>u.id===media.id)) throw new Error('Métadonnées du fichier manquantes.');
        if(object)await client.query('INSERT INTO imf_media_objects(id,object_key,size,sha256) VALUES($1,$2,$3,$4)',[media.id,object.key,object.size,object.sha256]);
        else await client.query('INSERT INTO imf_media(id,bytes) VALUES($1,$2)',[media.id,media.bytes]);
      }
      for (const id of removedMediaIds){await client.query('DELETE FROM imf_media WHERE id=$1',[id]);
        await client.query('INSERT INTO imf_media_deletions(object_key) SELECT object_key FROM imf_media_objects WHERE id=$1 ON CONFLICT DO NOTHING',[id]);
        await client.query('DELETE FROM imf_media_objects WHERE id=$1',[id]);}
      if(audit) await client.query('INSERT INTO imf_audit_events(id,at,actor_id,operation,data) VALUES($1,$2,$3,$4,$5)',[audit.id,audit.at,audit.actorId,audit.operation,audit]);
      const changed=(table,filter=()=>true)=>[...new Set([...snapshot.rows[table].keys(),...next[table].keys()])].some(key=>filter(next[table].get(key)??snapshot.rows[table].get(key))&&JSON.stringify(snapshot.rows[table].get(key))!==JSON.stringify(next[table].get(key)));
      if(changed('imf_projects')||changed('imf_lots')||changed('imf_records',row=>['news','settings'].includes(row.collection)))await client.query('UPDATE imf_public_revision SET revision=revision+1 WHERE id=1');
      const updated=await client.query('UPDATE imf_revision SET revision=revision+1 WHERE id=1 RETURNING revision');
      await client.query('COMMIT');
      cache=undefined;
      publicVersion++;
      publicCache=undefined;
      publicRead=undefined;
      snapshots.set(data,{revision:String(updated.rows[0].revision),rows:flatten(structuredClone(data)),original:structuredClone(data)});
    } catch(error) { await client.query('ROLLBACK').catch(()=>{});if(object){try{await require('./object-media.cjs').remove(object.key);}catch{await pool.query('INSERT INTO imf_media_deletions(object_key) VALUES($1) ON CONFLICT DO NOTHING',[object.key]).catch(()=>console.error('media_cleanup_pending'));}}throw error; }
    finally { client.release(); }
    if(process.env.MEDIA_S3_BUCKET)await require('./object-media.cjs').drain(pool).catch(()=>console.error('media_cleanup_pending'));
  }
  async function mediaSize(id) {
    await ensureSchema(pool);
    const result=await pool.query('SELECT size FROM imf_media_objects WHERE id=$1 UNION ALL SELECT octet_length(bytes) AS size FROM imf_media WHERE id=$1 LIMIT 1',[id]);
    return result.rows[0]?.size;
  }
  async function readMedia(id,start,end) {
    await ensureSchema(pool);
    const object=(await pool.query('SELECT object_key FROM imf_media_objects WHERE id=$1',[id])).rows[0];
    if(object)return require('./object-media.cjs').read(object.object_key,start,end);
    const result=await pool.query(start===undefined?'SELECT bytes FROM imf_media WHERE id=$1':'SELECT substring(bytes from $2::int for $3::int) AS bytes FROM imf_media WHERE id=$1',start===undefined?[id]:[id,start+1,end-start+1]);
    return result.rows[0]?.bytes;
  }
  async function streamMedia(id,start,end,signal) {
    await ensureSchema(pool);
    const object=(await pool.query('SELECT object_key FROM imf_media_objects WHERE id=$1',[id])).rows[0];
    if(object)return require('./object-media.cjs').stream(object.object_key,start,end,signal);
    return require('./media-stream.cjs').chunkStream(async(first,last)=>{
      const result=await pool.query('SELECT substring(bytes from $2::int for $3::int) AS bytes FROM imf_media WHERE id=$1',[id,first+1,last-first+1]);
      return result.rows[0]?.bytes;
    },start,end,signal);
  }
  async function readCrmWorkspace(collection,id) {
    await ensureSchema(pool);
    if(!['contacts','deals','activities','tasks'].includes(collection))throw new Error('Invalid collection');
    const rows=id?(await pool.query('SELECT data FROM imf_records WHERE collection=$1 AND id=$2',[collection,id])).rows:[];
    const data={projects:[],users:[],news:[],contacts:[],deals:[],activities:[],tasks:[],uploads:[]};
    data[collection]=rows.map(row=>row.data);
    snapshots.set(data,{rows:flatten(structuredClone(data)),original:structuredClone(data)});return data;
  }
  async function readCrmRecord(collection,id,contactId) {
    await ensureSchema(pool);
    if(!['contacts','deals','activities','tasks'].includes(collection))throw new Error('Invalid collection');
    return (await pool.query(`SELECT data FROM imf_records WHERE collection=$1 AND ($2::text IS NULL OR id=$2) AND ($3::text IS NULL OR data->>'contactId'=$3) ORDER BY data->>'date' DESC,id LIMIT 100`,[collection,id??null,contactId??null])).rows.map(row=>row.data);
  }
  async function readLotWorkspace(projectSlug,ref) {
    await ensureSchema(pool);
    const project=(await pool.query('SELECT slug,data FROM imf_projects WHERE slug=$1',[projectSlug])).rows[0];
    const lot=(await pool.query('SELECT ref,status,data FROM imf_lots WHERE project_slug=$1 AND ref=$2',[projectSlug,ref])).rows[0];
    const rows=(await pool.query('SELECT u.* FROM imf_users u JOIN imf_client_property_assignments a ON a.client_id=u.id WHERE a.project_slug=$1 AND a.lot_ref=$2',[projectSlug,ref])).rows;
    const users=rows.map(row=>({...row.data,id:row.id,email:row.email,role:row.role,passwordHash:row.password_hash,authVersion:row.auth_version,projectSlug:row.project_slug??undefined,lotRef:row.lot_ref??undefined,documents:[],archivedDocuments:[],messages:[]}));
    const data={projects:project?[{...project.data,slug:project.slug,lots:lot?[{...lot.data,ref:lot.ref,status:lot.status}]:[]}]:[],users,news:[],contacts:[],deals:[],activities:[],tasks:[],uploads:[]};
    snapshots.set(data,{rows:flatten(structuredClone(data)),original:structuredClone(data)});return data;
  }
  async function readPaymentWorkspace(id) {
    await ensureSchema(pool);
    const row=(await pool.query("SELECT * FROM imf_users WHERE id=$1 AND role='client'",[id])).rows[0];if(!row)throw new Error('Client introuvable.');
    const data={projects:[],users:[{...row.data,id:row.id,email:row.email,role:row.role,passwordHash:row.password_hash,authVersion:row.auth_version,projectSlug:row.project_slug??undefined,lotRef:row.lot_ref??undefined,documents:[],archivedDocuments:[],messages:[]}],news:[],contacts:[],deals:[],activities:[],tasks:[],uploads:[]};
    const projects=(await pool.query('SELECT DISTINCT p.slug,p.data FROM imf_projects p JOIN imf_client_property_assignments a ON a.project_slug=p.slug WHERE a.client_id=$1',[id])).rows;
    for(const project of projects)data.projects.push({...project.data,slug:project.slug,lots:[]});
    const lots=(await pool.query('SELECT l.* FROM imf_lots l JOIN imf_client_property_assignments a ON a.project_slug=l.project_slug AND a.lot_ref=l.ref WHERE a.client_id=$1',[id])).rows;
    for(const lot of lots)data.projects.find(project=>project.slug===lot.project_slug).lots.push({...lot.data,ref:lot.ref,status:lot.status});
    snapshots.set(data,{rows:flatten(structuredClone(data)),original:structuredClone(data)});return data;
  }
  async function readMediaMetadata(id) {
    await ensureSchema(pool);
    const result = await pool.query("SELECT data FROM imf_records WHERE collection='uploads' AND id=$1 LIMIT 1", [id]);
    return result.rows[0]?.data;
  }
  async function readAudit() {await ensureSchema(pool);return (await pool.query('SELECT data FROM imf_audit_events ORDER BY at DESC,id DESC LIMIT 100')).rows.map(row=>row.data);}
  async function conversationRevision(id,admin) {
    await ensureSchema(pool);
    const result=admin?await pool.query('SELECT revision::text FROM imf_revision WHERE id=1'):await pool.query("SELECT COALESCE((SELECT revision FROM imf_conversation_revisions WHERE client_id=$1),0)::text AS revision",[id]);
    return result.rows[0].revision;
  }
  async function canReadMedia(id,userId) {
    const row=(await pool.query("SELECT role,project_slug,lot_ref,data->'properties' AS properties,data->'constructionPhotos' AS construction_photos FROM imf_users WHERE id=$1",[userId])).rows[0]; if(!row)return false;if(row.role==='admin')return true;if(row.role!=='client')return false;const user={properties:row.properties,constructionPhotos:row.construction_photos,projectSlug:row.project_slug,lotRef:row.lot_ref};
    const file=await readMediaMetadata(id);if(!file)return false;const href=`/api/media/${id}`;
    if(file.clientId) return file.clientId===userId && (!!(await pool.query("SELECT 1 FROM imf_documents WHERE client_id=$1 AND archived=false AND data->>'href'=$2 LIMIT 1",[userId,href])).rows.length||!!user.constructionPhotos?.some(photo=>photo.src===href));
    const properties=user.properties??(user.projectSlug&&user.lotRef?[{projectSlug:user.projectSlug,lotRef:user.lotRef}]:[]);
    for(const property of properties) {
      const rows=await pool.query(`SELECT p.data->'constructionPhotos' AS project_photos,l.data->'constructionPhotos' AS lot_photos FROM imf_projects p JOIN imf_lots l ON l.project_slug=p.slug WHERE p.slug=$1 AND l.ref=$2`,[property.projectSlug,property.lotRef]);
      if(rows.rows.some(row=>[...(row.project_photos??[]),...(row.lot_photos??[])].some(photo=>photo.src===href)))return true;
    }return false;
  }
  return {searchProperties:async(...args)=>{await ensureSchema(pool);return require('./property-repository.cjs').search(pool,...args);},readCrmWorkspace,readCrmRecord,crmList:async(...args)=>{await ensureSchema(pool);return require('./crm-repository.cjs').list(pool,...args);},crmStats:async()=>{await ensureSchema(pool);return require('./crm-repository.cjs').stats(pool);},crmDashboard:async()=>{await ensureSchema(pool);return require('./crm-repository.cjs').dashboard(pool);},streamMedia,readLotWorkspace,publicRevision,clientRevision,captureLead:async(input)=>{await ensureSchema(pool);return require('./scoped-leads.cjs').captureLead(pool,input);},postMessage:async(...args)=>{await ensureSchema(pool);return require('./scoped-chat.cjs').postMessage(pool,...args);},readPaymentWorkspace,mediaSize,securityQuery:async(sql,params)=>{await ensureSchema(pool);return pool.query(sql,params);},original:data=>structuredClone(snapshots.get(data)?.original),readAudit,conversationRevision,canReadMedia,read,readPublic,revision,write,readMedia,readMediaMetadata,consumeRateLimit,readAuthUser,readUserById};
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
