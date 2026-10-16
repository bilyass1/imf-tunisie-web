import 'server-only';
import { assertProductionStorage } from './runtime-security';
import { cache as requestCache } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import type { VisitRequest } from './visit-request';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {
  Activity,
  Contact,
  CrmTask,
  Database,
  Deal,
  DealStage,
  Lot,
  LotStatus,
  Localized,
  Project,
  User,
} from './types';
import { DEAL_STAGES, PIPELINE_STAGES } from './types';
import { buildSeed } from './seed';
import { applyYassamineA5aFacts, includeYassamineApartments } from './yassamine-catalog';
import { includeYassamineA6Lots } from './yassamine-a6';
import { includeYassamineA5bLots } from './yassamine-a5b';
import { createAuditEvent } from './audit';
import { changeLotStatus } from './lot-commercial';
import { projectPresentation } from './project-presentation';
import { getStore, type MediaWrite } from './postgres-store.cjs';

/** DATABASE_URL selects PostgreSQL; otherwise use local JSON for development.
 * Remote connection failures never fall back to local demo data.
 */
const LOCAL_DIR = path.join(process.cwd(), 'data');
const TMP_DIR = path.join(os.tmpdir(), 'imf-data');

type Mode = 'file' | 'memory';

let mode: Mode | null = null;
let dataDir = LOCAL_DIR;
let dbFile = path.join(LOCAL_DIR, 'db.json');
let memory: Database | null = null;
let cache: { data: Database; mtime: number; size: number } | null = null;
const localVersions = new WeakMap<Database, string>();

function canWrite(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, '.write-test');
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function resolveMode(): Mode {
  if (mode) return mode;
  for (const dir of [LOCAL_DIR, TMP_DIR]) {
    if (canWrite(dir)) {
      dataDir = dir;
      dbFile = path.join(dir, 'db.json');
      mode = 'file';
      return mode;
    }
  }
  mode = 'memory';
  return mode;
}

function ensureFile(): void {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(buildSeed(), null, 2), 'utf8');
  }
}

export async function readDb(): Promise<Database> {
  assertProductionStorage();
  // Next.js calls generateStaticParams during `next build`, before the
  // production database migration is guaranteed to have run. Use the local
  // seed only for that compilation pass; every runtime request still requires
  // PostgreSQL and never falls back after a connection error.
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
  if (process.env.DATABASE_URL && !isBuild) {
    const data = await getStore(buildSeed).read();
    const project = data.projects.find(item => item.slug === 'diar-al-yassamine');
    if (project) includeYassamineA6Lots(includeYassamineA5bLots(applyYassamineA5aFacts(project)));
    return data;
  }
  if (resolveMode() === 'memory') {
    if (!memory) memory = buildSeed();
    return structuredClone(memory);
  }
  try {
    ensureFile();
    const stat = fs.statSync(dbFile); const mtime = stat.mtimeMs;
    if (!cache || cache.mtime !== mtime || cache.size !== stat.size) {
      const raw = fs.readFileSync(dbFile, 'utf8');
      const data = includeYassamineApartments(JSON.parse(raw) as Database);
      const project = data.projects.find(item => item.slug === 'diar-al-yassamine');
      if (project) includeYassamineA6Lots(includeYassamineA5bLots(project));
      cache = { data, mtime, size:stat.size };
    }
    const data = structuredClone(cache.data);
    localVersions.set(data, `${mtime}/${stat.size}`);
    return data;
  } catch {
    // Never replace existing customer records with demo data after a read error.
    throw new Error('Lecture des données impossible. Vérifiez le stockage et les sauvegardes.');
  }
}

export async function writeDb(data: Database): Promise<void> {
  (await writeCommercialDb(data));
}

/** Les écritures sont-elles durables ? Faux en hébergement serverless. */
export function isPersistent(): boolean {
  return Boolean(process.env.DATABASE_URL) || (process.env.NODE_ENV!=='production' && !process.env.VERCEL && resolveMode() === 'file' && dataDir === LOCAL_DIR);
}

/** Commercial records must never silently fall back to volatile memory. */
export async function writeCommercialDb(data: Database, media?: MediaWrite): Promise<void> {
  assertProductionStorage();
  if (process.env.DATABASE_URL) {
    try { const before=getStore(buildSeed).original(data);if(!before)throw new Error('Rechargez les données avant de les modifier.'); await getStore(buildSeed).write(data, media,createAuditEvent(before,data)); return; }
    catch (error) {
      if (error && typeof error === 'object' && 'code' in error) throw new Error('Enregistrement PostgreSQL impossible. Réessayez ou contactez l’administrateur.');
      throw error;
    }
  }
  if (!isPersistent()) throw new Error('Stockage durable indisponible.');
  const before = fs.statSync(dbFile);
  if (localVersions.get(data) !== `${before.mtimeMs}/${before.size}`) throw new Error('Les données ont changé. Réessayez.');
  const previous:Database=JSON.parse(fs.readFileSync(dbFile,'utf8'));
  const event=createAuditEvent(previous,data);
  data.auditEvents=[...(previous.auditEvents??[]),event];
  const previousUploads: NonNullable<Database['uploads']> = previous.uploads ?? [];
  const remainingMedia = new Set((data.uploads ?? []).map(file=>file.id));
  const removedMedia = previousUploads.filter(file=>!remainingMedia.has(file.id) && /^[a-f0-9-]{36}$/.test(file.id)).map(file=>file.id);
  let mediaFile: string | undefined;
  if (media) {
    const directory=path.join(LOCAL_DIR,'uploads'); fs.mkdirSync(directory,{recursive:true});
    mediaFile=path.join(directory,media.id); fs.writeFileSync(mediaFile,media.bytes,{flag:'wx'});
  }
  const tmp = `${dbFile}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, dbFile);
  } catch(error) { if(mediaFile) fs.rmSync(mediaFile,{force:true}); throw error; }
  const stat=fs.statSync(dbFile); cache = { data:structuredClone(data), mtime:stat.mtimeMs, size:stat.size };
  localVersions.set(data, `${stat.mtimeMs}/${stat.size}`);
  try { for (const id of removedMedia) fs.rmSync(path.join(LOCAL_DIR,'uploads',id),{force:true}); }
  catch { throw new Error('Le dossier est supprimé, mais le nettoyage de certains fichiers a échoué.'); }
}

export async function readMedia(id: string,start?:number,end?:number): Promise<Buffer | undefined> {
  if (!/^[a-f0-9-]{36}$/.test(id)) return undefined;
  if (process.env.DATABASE_URL) return getStore(buildSeed).readMedia(id,start,end);
  try {
    if(start===undefined)return await fs.promises.readFile(path.join(LOCAL_DIR,'uploads',id));
    const file=await fs.promises.open(path.join(LOCAL_DIR,'uploads',id),'r');try{const buffer=Buffer.alloc(end!-start+1);const {bytesRead}=await file.read(buffer,0,buffer.length,start);return buffer.subarray(0,bytesRead);}finally{await file.close();}
  }
  catch { return undefined; }
}

export async function streamMedia(id:string,start:number,end:number,signal?:AbortSignal):Promise<ReadableStream<Uint8Array>> {
  assertProductionStorage();
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid media');
  if(process.env.DATABASE_URL)return getStore(buildSeed).streamMedia(id,start,end,signal);
  const {chunkStream}=await import('./media-stream.cjs');
  return chunkStream((first:number,last:number)=>readMedia(id,first,last),start,end,signal);
}

export async function getMediaMetadata(id: string): Promise<NonNullable<Database['uploads']>[number] | undefined> {
  if (!/^[a-f0-9-]{36}$/.test(id)) return undefined;
  if (process.env.DATABASE_URL) return getStore(buildSeed).readMediaMetadata(id);
  return (await readDb()).uploads?.find(file => file.id === id);
}

/* ---------------------------- Projets ---------------------------- */

// Share public reads between metadata, layout, page and footer within one render.
// Writes and authentication retain their independent, versioned reads.
export const getCompanyData=requestCache(async()=>{
 assertProductionStorage();noStore();
 if(process.env.DATABASE_URL && process.env.NEXT_PHASE!=='phase-production-build')return (await getStore().securityQuery("SELECT data FROM imf_records WHERE collection='settings' AND id='company'")).rows[0]?.data as Database['company'];
 return (await readDb()).company;
});
export const getPublicData = requestCache(async () => {
  // Prices and availability must be read at runtime, never frozen from build seed data.
  assertProductionStorage();
  noStore();
  if (process.env.DATABASE_URL && process.env.NEXT_PHASE !== 'phase-production-build') {
    const data = await getStore(buildSeed).readPublic();
    const project = data.projects.find((item: Project) => item.slug === 'diar-al-yassamine');
    if (project) includeYassamineA6Lots(includeYassamineA5bLots(applyYassamineA5aFacts(project)));
    return data;
  }
  const { projects, company, news } = await readDb();
  return { projects: projects.map(project=>({...project,lots:project.lots.map(({reservationNote: _note,planDwgUrl:_dwg,...lot})=>lot)})), company, news };
});
/** A small cross-instance signal for already-open public pages. */
export async function getPublicRevision(): Promise<string> {
  if (process.env.DATABASE_URL && process.env.NEXT_PHASE !== 'phase-production-build') {
    return getStore(buildSeed).publicRevision();
  }
  if (resolveMode() !== 'file') return 'memory';
  ensureFile();
  const stat = fs.statSync(dbFile);
  return `${stat.mtimeMs}/${stat.size}`;
}
export async function getProjects(): Promise<Project[]> {
  return (await getPublicData()).projects.map(projectPresentation);
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await getProjects()).find((p) => p.slug === slug);
}

export async function getOngoingProjects(): Promise<Project[]> {
  return (await getProjects()).filter((p) => p.status === 'ongoing');
}

export async function getDeliveredProjects(): Promise<Project[]> {
  return (await getProjects()).filter((p) => p.status === 'delivered');
}

/* ------------------------------ Lots ------------------------------ */

export interface LotStats {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  minArea: number;
  maxArea: number;
  typologies: string[];
}

export async function getLot(projectSlug: string, ref: string): Promise<Lot | undefined> {
  return (await getProject(projectSlug))?.lots.find((l) => l.ref === ref);
}

export function lotStats(lots: Lot[]): LotStats {
  const areas = lots.map((l) => l.sellableArea ?? 0).filter((a) => a > 0);
  return {
    total: lots.length,
    available: lots.filter((l) => l.status === 'available').length,
    reserved: lots.filter((l) => l.status === 'reserved').length,
    sold: lots.filter((l) => l.status === 'sold').length,
    minArea: areas.length ? Math.min(...areas) : 0,
    maxArea: areas.length ? Math.max(...areas) : 0,
    typologies: Array.from(new Set(lots.map((l) => l.typology))).sort(),
  };
}

export async function updateLotStatus(projectSlug: string, lotRef: string, status: LotStatus, authorized = false, note?: string): Promise<boolean> {
  const db = await readLotWorkspace(projectSlug,lotRef);
  const project = db.projects.find((p) => p.slug === projectSlug);
  const lot = project?.lots.find((l) => l.ref === lotRef);
  if (!lot) return false;
  changeLotStatus(db,projectSlug,lot,status,authorized,note);
  (await writeDb(db));
  return true;
}

export async function updateLotPrice(projectSlug: string, lotRef: string, price: number | undefined): Promise<boolean> {
  const db = await readLotWorkspace(projectSlug,lotRef);
  const project = db.projects.find((p) => p.slug === projectSlug);
  const lot = project?.lots.find((l) => l.ref === lotRef);
  if (!lot) return false;
  lot.price = price;
  (await writeDb(db));
  return true;
}

export async function updateLotComposition(projectSlug: string, lotRef: string, composition: Localized[]): Promise<boolean> {
  const db = await readLotWorkspace(projectSlug,lotRef);
  const lot = db.projects.find((p) => p.slug === projectSlug)?.lots.find((item) => item.ref === lotRef);
  if (!lot) return false;
  lot.composition = composition;
  await writeDb(db);
  return true;
}

/* ------------------------------- CRM ------------------------------ */

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const today = () => new Date().toISOString().slice(0, 10);

export async function readCrmWorkspace(collection:'contacts'|'deals'|'activities'|'tasks',id?:string):Promise<Database> {
  assertProductionStorage();
  return process.env.DATABASE_URL?getStore().readCrmWorkspace(collection,id):readDb();
}

export async function getContacts(): Promise<Contact[]> {
  return (await readDb()).contacts;
}

export async function getContact(id: string): Promise<Contact | undefined> {
  if(process.env.DATABASE_URL)return (await getStore().readCrmRecord('contacts',id))[0];
  return (await readDb()).contacts.find((c) => c.id === id);
}

export async function getDeals(): Promise<Deal[]> {
  return (await readDb()).deals;
}

export async function getDeal(id: string): Promise<Deal | undefined> {
  return (await readDb()).deals.find((d) => d.id === id);
}

export async function getDealsForContact(contactId: string): Promise<Deal[]> {
  if(process.env.DATABASE_URL)return getStore().readCrmRecord('deals',undefined,contactId);
  return (await readDb()).deals.filter((d) => d.contactId === contactId);
}

export async function getActivities(): Promise<Activity[]> {
  return (await readDb()).activities;
}

export async function getActivitiesForContact(contactId: string): Promise<Activity[]> {
  if(process.env.DATABASE_URL)return getStore().readCrmRecord('activities',undefined,contactId);
  return (await readDb())
    .activities.filter((a) => a.contactId === contactId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getTasks(): Promise<CrmTask[]> {
  return (await readDb()).tasks;
}

/**
 * Point d'entrée du formulaire public : crée (ou retrouve) le contact,
 * ouvre une opportunité et journalise l'activité — comme un vrai CRM.
 */
export async function captureWebLead(input: {
  name: string;
  email?: string;
  phone: string;
  message: string;
  projectSlug?: string;
  lotRef?: string;
  budget?: string;
  visit?: VisitRequest;
}): Promise<{ contact: Contact; deal: Deal }> {
  assertProductionStorage();
  if(process.env.DATABASE_URL)return getStore().captureLead(input);
  const db = (await readDb());
  if (input.visit) {
    const property = db.projects.find(p => p.slug === input.projectSlug)?.lots.find(l => l.ref === input.lotRef || l.code === input.lotRef);
    if (!property || property.status !== 'available') throw new Error('VISIT_UNAVAILABLE');
    input = { ...input, lotRef: property.ref };
  }
  const normalizedPhone = input.phone.replace(/\s/g, '');

  let contact = db.contacts.find(
    (c) =>
      c.phone.replace(/\s/g, '') === normalizedPhone ||
      (Boolean(input.email) && c.email?.toLowerCase() === input.email?.toLowerCase()),
  );

  if (!contact) {
    contact = {
      id: uid('c'),
      createdAt: today(),
      name: input.name,
      email: input.email || undefined,
      phone: input.phone,
      source: 'website',
      projectSlug:db.projects.some(project=>project.slug===input.projectSlug)?input.projectSlug:undefined,
      lotRef:db.projects.find(project=>project.slug===input.projectSlug)?.lots.find(lot=>lot.ref===input.lotRef)?.ref,
      budget: input.budget || undefined,
      tags: [],
    };
    db.contacts.unshift(contact);
  }

  const deal: Deal = {
    id: uid('d'),
    createdAt: today(),
    updatedAt: today(),
    contactId: contact.id,
    title: input.visit ? `${input.lotRef} — demande de visite` : input.lotRef ? `${input.lotRef} — demande web` : 'Demande d’information — site web',
    projectSlug: input.projectSlug || undefined,
    lotRef: input.lotRef || undefined,
    stage: 'new',
    probability: 10,
  };
  db.deals.unshift(deal);

  db.activities.unshift({
    id: uid('a'),
    date: today(),
    type: 'note',
    contactId: contact.id,
    dealId: deal.id,
    body: input.visit ? `Demande de visite à confirmer · ${input.visit.date} à ${input.visit.time} (heure de Tunis) · ${input.visit.mode === 'video' ? 'Visioconférence' : 'Sur place'}\n${input.message}` : input.message,
  });

  db.tasks.unshift({
    id: uid('t'),
    createdAt: today(),
    title: input.visit ? `Confirmer la visite de ${contact.name} · ${input.lotRef} · ${input.visit.date} ${input.visit.time} (Tunis)` : `Rappeler ${contact.name} (demande web)`,
    dueDate: today(),
    done: false,
    contactId: contact.id,
    dealId: deal.id,
  });

  (await writeDb(db));
  return { contact, deal };
}

export async function setDealStage(id: string, stage: DealStage, lostReason?: string): Promise<boolean> {
  const db = await readCrmWorkspace('deals',id);
  const deal = db.deals.find((d) => d.id === id);
  if (!deal) return false;
  deal.stage = stage;
  deal.updatedAt = today();
  deal.probability = { new: 10, contacted: 25, visit: 45, offer: 60, reserved: 90, sold: 100, lost: 0 }[stage];
  if (stage === 'lost') deal.lostReason = lostReason;
  db.activities.unshift({
    id: uid('a'),
    date: today(),
    type: 'note',
    contactId: deal.contactId,
    dealId: deal.id,
    body: `Étape passée à « ${stage} ».${lostReason ? ` Motif : ${lostReason}` : ''}`,
  });
  (await writeDb(db));
  return true;
}

export async function updateDeal(id: string, patch: Partial<Pick<Deal, 'value' | 'expectedCloseDate' | 'title'>>): Promise<boolean> {
  const db = await readCrmWorkspace('deals',id);
  const deal = db.deals.find((d) => d.id === id);
  if (!deal) return false;
  Object.assign(deal, patch);
  deal.updatedAt = today();
  (await writeDb(db));
  return true;
}

export async function addActivity(input: Omit<Activity, 'id'>): Promise<Activity> {
  const db = await readCrmWorkspace('activities');
  const created: Activity = { ...input, id: uid('a') };
  db.activities.unshift(created);
  (await writeDb(db));
  return created;
}

export async function addContact(input: Omit<Contact, 'id' | 'createdAt' | 'tags'> & { tags?: string[] }): Promise<Contact> {
  const db = await readCrmWorkspace('contacts');
  const created: Contact = { ...input, tags: input.tags ?? [], id: uid('c'), createdAt: today() };
  db.contacts.unshift(created);
  (await writeDb(db));
  return created;
}

export async function addTask(input: Omit<CrmTask, 'id' | 'createdAt' | 'done'>): Promise<CrmTask> {
  const db = await readCrmWorkspace('tasks');
  const created: CrmTask = { ...input, id: uid('t'), createdAt: today(), done: false };
  db.tasks.unshift(created);
  (await writeDb(db));
  return created;
}

export async function toggleTask(id: string): Promise<boolean> {
  const db = await readCrmWorkspace('tasks',id);
  const task = db.tasks.find((t) => t.id === id);
  if (!task) return false;
  task.done = !task.done;
  (await writeDb(db));
  return true;
}

/** Efface tous les enregistrements marqués « démonstration ». */
export async function clearDemoCrm(): Promise<void> {
  const db = (await readDb());
  db.contacts = db.contacts.filter((c) => !c.demo);
  db.deals = db.deals.filter((d) => !d.demo);
  db.activities = db.activities.filter((a) => !a.demo);
  db.tasks = db.tasks.filter((t) => !t.demo);
  (await writeDb(db));
}

export interface PipelineStats {
  openDeals: number;
  openValue: number;
  weightedValue: number;
  wonThisYear: number;
  wonValue: number;
  lost: number;
  conversion: number;
  byStage: Record<DealStage, { count: number; value: number }>;
}

export async function pipelineStats(): Promise<PipelineStats> {
  if(process.env.DATABASE_URL)return getStore().crmStats();
  const deals = (await getDeals());
  const byStage = DEAL_STAGES.reduce(
    (acc, stage) => {
      const subset = deals.filter((d) => d.stage === stage);
      acc[stage] = { count: subset.length, value: subset.reduce((s, d) => s + (d.value ?? 0), 0) };
      return acc;
    },
    {} as Record<DealStage, { count: number; value: number }>,
  );

  const open = deals.filter((d) => PIPELINE_STAGES.includes(d.stage));
  const won = deals.filter((d) => d.stage === 'sold');
  const lost = deals.filter((d) => d.stage === 'lost');
  const closed = won.length + lost.length;

  return {
    openDeals: open.length,
    openValue: open.reduce((s, d) => s + (d.value ?? 0), 0),
    weightedValue: Math.round(open.reduce((s, d) => s + ((d.value ?? 0) * d.probability) / 100, 0)),
    wonThisYear: won.length,
    wonValue: won.reduce((s, d) => s + (d.value ?? 0), 0),
    lost: lost.length,
    conversion: closed > 0 ? Math.round((won.length / closed) * 100) : 0,
    byStage,
  };
}

/* --------------------------- Utilisateurs -------------------------- */

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return (await readDb()).users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
}

export async function getUserById(id: string): Promise<User | undefined> {
  if (process.env.DATABASE_URL && process.env.NEXT_PHASE !== 'phase-production-build') return getStore(buildSeed).readUserById(id);
  return (await readDb()).users.find((u) => u.id === id);
}

/** A session only needs identity and role; avoid loading the entire CRM. */
export async function getAuthUserById(id: string) {
  if (process.env.DATABASE_URL && process.env.NEXT_PHASE !== 'phase-production-build') return getStore(buildSeed).readAuthUser('id', id);
  return (await readDb()).users.find((u) => u.id === id);
}

export async function getAuthUserByEmail(email: string) {
  if (process.env.DATABASE_URL && process.env.NEXT_PHASE !== 'phase-production-build') return getStore(buildSeed).readAuthUser('email', email.trim());
  return (await readDb()).users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
}

export async function getClients(): Promise<User[]> {
  return (await readDb()).users.filter((u) => u.role === 'client');
}

/* ---------------------------- Actualités --------------------------- */

export async function getNews() {
  return (await getPublicData()).news;
}

export async function getNewsItem(slug: string) {
  return (await getPublicData()).news.find((n) => n.slug === slug);
}

/* --------------------- Jeu de démonstration ------------------------ */

/**
 * Legacy bulk demo entry points stay blocked to preserve client and PIN rules.
 */
export async function applyDemoStatuses(_projectSlug: string): Promise<void> {
  throw new Error('Les statuts de démonstration sont désactivés : gérez les ventes avec un compte client.');
}

export async function resetLotStatuses(_projectSlug: string): Promise<void> {
  throw new Error('La réinitialisation globale est désactivée : modifiez chaque appartement avec son contrôle PIN.');
}

/** Narrow queries used by polling and private-file authorization. */
export async function getConversationRevision(userId:string,admin:boolean):Promise<string> {
  if(process.env.DATABASE_URL) return getStore(buildSeed).conversationRevision(userId,admin);
  const {createHash}=await import('node:crypto');
  const users=(await readDb()).users.filter(user=>admin?user.role==='client':user.id===userId);
  return createHash('sha256').update(JSON.stringify(users.map(user=>({id:user.id,name:user.name,messages:user.messages})))).digest('hex');
}
export async function canReadPrivateMedia(id:string,userId:string):Promise<boolean> {
  if(process.env.DATABASE_URL) return getStore(buildSeed).canReadMedia(id,userId);
  const db=await readDb(),user=db.users.find(user=>user.id===userId),file=db.uploads?.find(file=>file.id===id);
  if(!user || !file) return false;
  if(user.role==='admin') return true;
  if(user.role!=='client') return false;
  const href=`/api/media/${id}`;
  if(file.clientId) return file.clientId===user.id && (!!user.documents?.some(document=>document.href===href)||!!user.constructionPhotos?.some(photo=>photo.src===href));
  const {clientProperties}=await import('./client-properties');
  return clientProperties(user).some(property=>{const project=db.projects.find(project=>project.slug===property.projectSlug),lot=project?.lots.find(lot=>lot.ref===property.lotRef);return [...(project?.constructionPhotos??[]),...(lot?.constructionPhotos??[])].some(photo=>photo.src===href);});
}
export async function getAuditEvents() {
  return process.env.DATABASE_URL?getStore(buildSeed).readAudit():[...(await readDb()).auditEvents??[]].reverse().slice(0,100);
}

export async function getMediaSize(id:string):Promise<number|undefined> {
 if(!/^[a-f0-9-]{36}$/.test(id))return undefined;
 if(process.env.DATABASE_URL)return getStore().mediaSize(id);
 return fs.promises.stat(path.join(LOCAL_DIR,'uploads',id)).then(stat=>stat.size).catch(()=>undefined);
}
export async function readPaymentWorkspace(id:string) {
 assertProductionStorage();return process.env.DATABASE_URL?getStore().readPaymentWorkspace(id):readDb();
}

export async function getClientRevision(id:string):Promise<string> {
  assertProductionStorage();return process.env.DATABASE_URL?getStore().clientRevision(id):getPublicRevision();
}

export async function readLotWorkspace(projectSlug:string,lotRef:string) {
  assertProductionStorage();return process.env.DATABASE_URL?getStore().readLotWorkspace(projectSlug,lotRef):readDb();
}
