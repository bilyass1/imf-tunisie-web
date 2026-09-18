import 'server-only';
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
  Project,
  User,
} from './types';
import { DEAL_STAGES, PIPELINE_STAGES } from './types';
import { buildSeed } from './seed';
import { includeYassamineApartments } from './yassamine-catalog';
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
  if (process.env.DATABASE_URL) return getStore().read();
  if (resolveMode() === 'memory') {
    if (!memory) memory = buildSeed();
    return structuredClone(memory);
  }
  try {
    ensureFile();
    const stat = fs.statSync(dbFile); const mtime = stat.mtimeMs;
    if (!cache || cache.mtime !== mtime || cache.size !== stat.size) {
      const raw = fs.readFileSync(dbFile, 'utf8');
      cache = { data:includeYassamineApartments(JSON.parse(raw) as Database), mtime, size:stat.size };
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
  return Boolean(process.env.DATABASE_URL) || (!process.env.VERCEL && resolveMode() === 'file' && dataDir === LOCAL_DIR);
}

/** Commercial records must never silently fall back to volatile memory. */
export async function writeCommercialDb(data: Database, media?: MediaWrite): Promise<void> {
  if (process.env.DATABASE_URL) {
    try { await getStore().write(data, media); return; }
    catch (error) {
      if (error && typeof error === 'object' && 'code' in error) throw new Error('Enregistrement PostgreSQL impossible. Réessayez ou contactez l’administrateur.');
      throw error;
    }
  }
  if (!isPersistent()) throw new Error('Stockage durable indisponible.');
  const before = fs.statSync(dbFile);
  if (localVersions.get(data) !== `${before.mtimeMs}/${before.size}`) throw new Error('Les données ont changé. Réessayez.');
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
}

export async function readMedia(id: string): Promise<Buffer | undefined> {
  if (!/^[a-f0-9-]{36}$/.test(id)) return undefined;
  if (process.env.DATABASE_URL) return getStore().readMedia(id);
  try { return await fs.promises.readFile(path.join(LOCAL_DIR,'uploads',id)); }
  catch { return undefined; }
}

/* ---------------------------- Projets ---------------------------- */

export async function getProjects(): Promise<Project[]> {
  return (await readDb()).projects;
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await readDb()).projects.find((p) => p.slug === slug);
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

export async function updateLotStatus(projectSlug: string, lotRef: string, status: LotStatus): Promise<boolean> {
  const db = (await readDb());
  const project = db.projects.find((p) => p.slug === projectSlug);
  const lot = project?.lots.find((l) => l.ref === lotRef);
  if (!lot) return false;
  lot.status = status;
  (await writeDb(db));
  return true;
}

export async function updateLotPrice(projectSlug: string, lotRef: string, price: number | undefined): Promise<boolean> {
  const db = (await readDb());
  const project = db.projects.find((p) => p.slug === projectSlug);
  const lot = project?.lots.find((l) => l.ref === lotRef);
  if (!lot) return false;
  lot.price = price;
  (await writeDb(db));
  return true;
}

/* ------------------------------- CRM ------------------------------ */

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const today = () => new Date().toISOString().slice(0, 10);

export async function getContacts(): Promise<Contact[]> {
  return (await readDb()).contacts;
}

export async function getContact(id: string): Promise<Contact | undefined> {
  return (await readDb()).contacts.find((c) => c.id === id);
}

export async function getDeals(): Promise<Deal[]> {
  return (await readDb()).deals;
}

export async function getDeal(id: string): Promise<Deal | undefined> {
  return (await readDb()).deals.find((d) => d.id === id);
}

export async function getDealsForContact(contactId: string): Promise<Deal[]> {
  return (await readDb()).deals.filter((d) => d.contactId === contactId);
}

export async function getActivities(): Promise<Activity[]> {
  return (await readDb()).activities;
}

export async function getActivitiesForContact(contactId: string): Promise<Activity[]> {
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
}): Promise<{ contact: Contact; deal: Deal }> {
  const db = (await readDb());
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
    title: input.lotRef ? `${input.lotRef} — demande web` : 'Demande d’information — site web',
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
    body: input.message,
  });

  db.tasks.unshift({
    id: uid('t'),
    createdAt: today(),
    title: `Rappeler ${contact.name} (demande web)`,
    dueDate: today(),
    done: false,
    contactId: contact.id,
    dealId: deal.id,
  });

  (await writeDb(db));
  return { contact, deal };
}

export async function setDealStage(id: string, stage: DealStage, lostReason?: string): Promise<boolean> {
  const db = (await readDb());
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
  const db = (await readDb());
  const deal = db.deals.find((d) => d.id === id);
  if (!deal) return false;
  Object.assign(deal, patch);
  deal.updatedAt = today();
  (await writeDb(db));
  return true;
}

export async function addActivity(input: Omit<Activity, 'id'>): Promise<Activity> {
  const db = (await readDb());
  const created: Activity = { ...input, id: uid('a') };
  db.activities.unshift(created);
  (await writeDb(db));
  return created;
}

export async function addContact(input: Omit<Contact, 'id' | 'createdAt' | 'tags'> & { tags?: string[] }): Promise<Contact> {
  const db = (await readDb());
  const created: Contact = { ...input, tags: input.tags ?? [], id: uid('c'), createdAt: today() };
  db.contacts.unshift(created);
  (await writeDb(db));
  return created;
}

export async function addTask(input: Omit<CrmTask, 'id' | 'createdAt' | 'done'>): Promise<CrmTask> {
  const db = (await readDb());
  const created: CrmTask = { ...input, id: uid('t'), createdAt: today(), done: false };
  db.tasks.unshift(created);
  (await writeDb(db));
  return created;
}

export async function toggleTask(id: string): Promise<boolean> {
  const db = (await readDb());
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
  return (await readDb()).users.find((u) => u.id === id);
}

export async function getClients(): Promise<User[]> {
  return (await readDb()).users.filter((u) => u.role === 'client');
}

/* ---------------------------- Actualités --------------------------- */

export async function getNews() {
  return (await readDb()).news;
}

export async function getNewsItem(slug: string) {
  return (await readDb()).news.find((n) => n.slug === slug);
}

/* --------------------- Jeu de démonstration ------------------------ */

/**
 * Applique un jeu de statuts de démonstration (pour les présentations
 * clients). Réversible via resetLotStatuses().
 */
export async function applyDemoStatuses(projectSlug: string): Promise<void> {
  const db = (await readDb());
  const project = db.projects.find((p) => p.slug === projectSlug);
  if (!project) return;
  project.lots.forEach((lot, i) => {
    const m = i % 7;
    lot.status = m === 0 || m === 3 ? 'sold' : m === 5 ? 'reserved' : 'available';
  });
  (await writeDb(db));
}

export async function resetLotStatuses(projectSlug: string): Promise<void> {
  const db = (await readDb());
  const project = db.projects.find((p) => p.slug === projectSlug);
  if (!project) return;
  project.lots.forEach((lot) => {
    lot.status = 'available';
  });
  (await writeDb(db));
}
