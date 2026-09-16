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

/**
 * Couche de persistance simple, basée sur un fichier JSON (data/db.json).
 * ---------------------------------------------------------------------
 * Volontairement sans dépendance : le projet démarre avec `npm install`
 * puis `npm run dev`, sans installer ni configurer de base de données.
 *
 * Pour passer en production multi-instances, remplacer UNIQUEMENT les
 * fonctions exportées ci-dessous par des requêtes Prisma / PostgreSQL :
 * le reste de l'application ne connaît que cette interface.
 */

/**
 * Emplacement du fichier de données.
 *
 * En local, `data/db.json` à la racine du projet. En hébergement serverless
 * (Vercel, AWS Lambda…) le dossier de l'application est en LECTURE SEULE :
 * on bascule alors sur /tmp, seul dossier inscriptible, et si même /tmp est
 * refusé on garde tout en mémoire. Le site reste consultable dans tous les
 * cas ; seules les écritures deviennent temporaires. Voir la note « Passage
 * en production » du README.
 */
const LOCAL_DIR = path.join(process.cwd(), 'data');
const TMP_DIR = path.join(os.tmpdir(), 'imf-data');

type Mode = 'file' | 'memory';

let mode: Mode | null = null;
let dataDir = LOCAL_DIR;
let dbFile = path.join(LOCAL_DIR, 'db.json');
let memory: Database | null = null;
let cache: { data: Database; mtime: number } | null = null;

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

export function readDb(): Database {
  if (resolveMode() === 'memory') {
    if (!memory) memory = buildSeed();
    return memory;
  }
  try {
    ensureFile();
    const mtime = fs.statSync(dbFile).mtimeMs;
    if (cache && cache.mtime === mtime) return cache.data;
    const raw = fs.readFileSync(dbFile, 'utf8');
    const data = includeYassamineApartments(JSON.parse(raw) as Database);
    cache = { data, mtime };
    return data;
  } catch {
    // disque devenu inaccessible en cours de route : on ne casse pas le site
    mode = 'memory';
    if (!memory) memory = buildSeed();
    return memory;
  }
}

export function writeDb(data: Database): void {
  if (resolveMode() === 'memory') {
    memory = data;
    return;
  }
  try {
    ensureFile();
    const tmp = `${dbFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, dbFile);
    cache = { data, mtime: fs.statSync(dbFile).mtimeMs };
  } catch {
    mode = 'memory';
    memory = data;
  }
}

/** Les écritures sont-elles durables ? Faux en hébergement serverless. */
export function isPersistent(): boolean {
  return resolveMode() === 'file' && dataDir === LOCAL_DIR;
}

/* ---------------------------- Projets ---------------------------- */

export function getProjects(): Project[] {
  return readDb().projects;
}

export function getProject(slug: string): Project | undefined {
  return readDb().projects.find((p) => p.slug === slug);
}

export function getOngoingProjects(): Project[] {
  return getProjects().filter((p) => p.status === 'ongoing');
}

export function getDeliveredProjects(): Project[] {
  return getProjects().filter((p) => p.status === 'delivered');
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

export function getLot(projectSlug: string, ref: string): Lot | undefined {
  return getProject(projectSlug)?.lots.find((l) => l.ref === ref);
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

export function updateLotStatus(projectSlug: string, lotRef: string, status: LotStatus): boolean {
  const db = readDb();
  const project = db.projects.find((p) => p.slug === projectSlug);
  const lot = project?.lots.find((l) => l.ref === lotRef);
  if (!lot) return false;
  lot.status = status;
  writeDb(db);
  return true;
}

export function updateLotPrice(projectSlug: string, lotRef: string, price: number | undefined): boolean {
  const db = readDb();
  const project = db.projects.find((p) => p.slug === projectSlug);
  const lot = project?.lots.find((l) => l.ref === lotRef);
  if (!lot) return false;
  lot.price = price;
  writeDb(db);
  return true;
}

/* ------------------------------- CRM ------------------------------ */

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const today = () => new Date().toISOString().slice(0, 10);

export function getContacts(): Contact[] {
  return readDb().contacts;
}

export function getContact(id: string): Contact | undefined {
  return readDb().contacts.find((c) => c.id === id);
}

export function getDeals(): Deal[] {
  return readDb().deals;
}

export function getDeal(id: string): Deal | undefined {
  return readDb().deals.find((d) => d.id === id);
}

export function getDealsForContact(contactId: string): Deal[] {
  return readDb().deals.filter((d) => d.contactId === contactId);
}

export function getActivities(): Activity[] {
  return readDb().activities;
}

export function getActivitiesForContact(contactId: string): Activity[] {
  return readDb()
    .activities.filter((a) => a.contactId === contactId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getTasks(): CrmTask[] {
  return readDb().tasks;
}

/**
 * Point d'entrée du formulaire public : crée (ou retrouve) le contact,
 * ouvre une opportunité et journalise l'activité — comme un vrai CRM.
 */
export function captureWebLead(input: {
  name: string;
  email?: string;
  phone: string;
  message: string;
  projectSlug?: string;
  lotRef?: string;
  budget?: string;
}): { contact: Contact; deal: Deal } {
  const db = readDb();
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

  writeDb(db);
  return { contact, deal };
}

export function setDealStage(id: string, stage: DealStage, lostReason?: string): boolean {
  const db = readDb();
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
  writeDb(db);
  return true;
}

export function updateDeal(id: string, patch: Partial<Pick<Deal, 'value' | 'expectedCloseDate' | 'title'>>): boolean {
  const db = readDb();
  const deal = db.deals.find((d) => d.id === id);
  if (!deal) return false;
  Object.assign(deal, patch);
  deal.updatedAt = today();
  writeDb(db);
  return true;
}

export function addActivity(input: Omit<Activity, 'id'>): Activity {
  const db = readDb();
  const created: Activity = { ...input, id: uid('a') };
  db.activities.unshift(created);
  writeDb(db);
  return created;
}

export function addContact(input: Omit<Contact, 'id' | 'createdAt' | 'tags'> & { tags?: string[] }): Contact {
  const db = readDb();
  const created: Contact = { ...input, tags: input.tags ?? [], id: uid('c'), createdAt: today() };
  db.contacts.unshift(created);
  writeDb(db);
  return created;
}

export function addTask(input: Omit<CrmTask, 'id' | 'createdAt' | 'done'>): CrmTask {
  const db = readDb();
  const created: CrmTask = { ...input, id: uid('t'), createdAt: today(), done: false };
  db.tasks.unshift(created);
  writeDb(db);
  return created;
}

export function toggleTask(id: string): boolean {
  const db = readDb();
  const task = db.tasks.find((t) => t.id === id);
  if (!task) return false;
  task.done = !task.done;
  writeDb(db);
  return true;
}

/** Efface tous les enregistrements marqués « démonstration ». */
export function clearDemoCrm(): void {
  const db = readDb();
  db.contacts = db.contacts.filter((c) => !c.demo);
  db.deals = db.deals.filter((d) => !d.demo);
  db.activities = db.activities.filter((a) => !a.demo);
  db.tasks = db.tasks.filter((t) => !t.demo);
  writeDb(db);
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

export function pipelineStats(): PipelineStats {
  const deals = getDeals();
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

export function getUserByEmail(email: string): User | undefined {
  return readDb().users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
}

export function getUserById(id: string): User | undefined {
  return readDb().users.find((u) => u.id === id);
}

export function getClients(): User[] {
  return readDb().users.filter((u) => u.role === 'client');
}

/* ---------------------------- Actualités --------------------------- */

export function getNews() {
  return readDb().news;
}

export function getNewsItem(slug: string) {
  return readDb().news.find((n) => n.slug === slug);
}

/* --------------------- Jeu de démonstration ------------------------ */

/**
 * Applique un jeu de statuts de démonstration (pour les présentations
 * clients). Réversible via resetLotStatuses().
 */
export function applyDemoStatuses(projectSlug: string): void {
  const db = readDb();
  const project = db.projects.find((p) => p.slug === projectSlug);
  if (!project) return;
  project.lots.forEach((lot, i) => {
    const m = i % 7;
    lot.status = m === 0 || m === 3 ? 'sold' : m === 5 ? 'reserved' : 'available';
  });
  writeDb(db);
}

export function resetLotStatuses(projectSlug: string): void {
  const db = readDb();
  const project = db.projects.find((p) => p.slug === projectSlug);
  if (!project) return;
  project.lots.forEach((lot) => {
    lot.status = 'available';
  });
  writeDb(db);
}
