export type LotStatus = 'available' | 'reserved' | 'sold';
export type ProjectStatus = 'ongoing' | 'delivered' | 'upcoming';

export interface Localized {
  fr: string;
  en: string;
  ar: string;
}

/** Une pièce de l'appartement, support de la visite 360° */
export interface Room {
  id: string;
  label: Localized;
  /** Panoramique équirectangulaire 2:1 — ex. /360/la-gloire/A11/salon.jpg */
  panorama?: string;
  /** Position du point chaud sur le plan, en % de la largeur / hauteur de l'image */
  hotspot?: { x: number; y: number };
  /** Rotation initiale de la caméra, en degrés */
  yaw?: number;
}

export interface Lot {
  /** Code commercial, ex. "A 1-1" */
  code: string;
  /** Identifiant de fichier / slug, ex. "A11" */
  ref: string;
  block: string;
  /** 0 = RDC */
  floor: number;
  /** S+1, S+2, S+3… */
  typology: string;
  /** Surface hors œuvre (m²) */
  grossArea?: number;
  /** Surface vendable (m²) — la surface commerciale */
  sellableArea?: number;
  gardenArea?: number;
  terraceArea?: number;
  status: LotStatus;
  /** Prix indicatif en TND (saisi au back-office) */
  price?: number;
  /** PDF d'origine du plan de vente */
  planUrl?: string;
  /** Image web du plan (générée depuis le PDF par scripts/generate-plans.mjs) */
  planImage?: string;
  /** Pièces de l'appartement, pour la visite 360° */
  rooms?: Room[];
  /** Orientation (N, NE, E…) */
  orientation?: string;
  /**
   * Emprise réelle du lot en mètres, relevée sur le plan de repérage de sa fiche
   * de vente. Repère du plan vu de dessus : x → est, y → sud, origine au centre
   * du bâtiment. Sert à générer la maquette 3D conforme au plan d'architecte.
   */
  footprint?: [number, number][];
}

export interface ProjectBlock {
  id: string;
  label: string;
  floors: number[];
}

export interface ProgressStep {
  label: Localized;
  percent: number;
  done: boolean;
}

/** Paramètres de la maquette 3D interactive d'un projet */
export interface Massing {
  /** Hauteur d'étage, en mètres */
  floorHeight: number;
  /** Emprise du terrain, en mètres, dans le repère des emprises de lots */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Cour intérieure / patio */
  patio?: { x: number; y: number; radius: number };
  /** Cour intérieure rectangulaire relevée sur le DWG d'exécution */
  courtyard?: { minX: number; minY: number; maxX: number; maxY: number };
  /**
   * Repli pour les programmes dont les emprises réelles ne sont pas encore
   * relevées : les volumes sont alors générés en barres, un bloc par entrée.
   */
  fallbackBars?: { id: string; x: number; z: number }[];
}

export interface Project {
  slug: string;
  name: string;
  subtitle: Localized;
  city: string;
  address: Localized;
  status: ProjectStatus;
  year: number;
  deliveryLabel?: Localized;
  heroImage: string;
  cover: string;
  gallery: { src: string; caption: Localized }[];
  description: Localized;
  highlights: Localized[];
  specs: { label: Localized; value: Localized }[];
  amenities: string[];
  blocks: ProjectBlock[];
  lots: Lot[];
  foprolos?: boolean;
  videoNote?: Localized;
  progress?: ProgressStep[];
  mapQuery: string;
  massing?: Massing;
}

export interface NewsItem {
  slug: string;
  date: string;
  title: Localized;
  excerpt: Localized;
  body: Localized;
  image: string;
}

/* ------------------------------------------------------------------ */
/*  CRM                                                                */
/* ------------------------------------------------------------------ */

export type DealStage = 'new' | 'contacted' | 'visit' | 'offer' | 'reserved' | 'sold' | 'lost';

export const DEAL_STAGES: DealStage[] = ['new', 'contacted', 'visit', 'offer', 'reserved', 'sold', 'lost'];

/** Étapes actives du pipeline (hors gagné / perdu) */
export const PIPELINE_STAGES: DealStage[] = ['new', 'contacted', 'visit', 'offer', 'reserved'];

export type ContactSource = 'website' | 'phone' | 'walk-in' | 'referral' | 'facebook' | 'salon' | 'other';

export interface Contact {
  id: string;
  createdAt: string;
  name: string;
  email?: string;
  phone: string;
  city?: string;
  source: ContactSource;
  budget?: string;
  tags: string[];
  ownerId?: string;
  notes?: string;
  /** Enregistrement du jeu de démonstration (effaçable en un clic depuis le CRM) */
  demo?: boolean;
}

export interface Deal {
  id: string;
  createdAt: string;
  updatedAt: string;
  contactId: string;
  title: string;
  projectSlug?: string;
  lotRef?: string;
  stage: DealStage;
  /** Montant en TND */
  value?: number;
  probability: number;
  expectedCloseDate?: string;
  ownerId?: string;
  lostReason?: string;
  /** Enregistrement du jeu de démonstration (effaçable en un clic depuis le CRM) */
  demo?: boolean;
}

export type ActivityType = 'call' | 'email' | 'visit' | 'meeting' | 'note' | 'whatsapp';

export interface Activity {
  id: string;
  date: string;
  type: ActivityType;
  contactId: string;
  dealId?: string;
  body: string;
  authorId?: string;
  /** Enregistrement du jeu de démonstration (effaçable en un clic depuis le CRM) */
  demo?: boolean;
}

export interface CrmTask {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
  contactId?: string;
  dealId?: string;
  ownerId?: string;
  createdAt: string;
  /** Enregistrement du jeu de démonstration (effaçable en un clic depuis le CRM) */
  demo?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Espace client                                                      */
/* ------------------------------------------------------------------ */

export interface PaymentLine {
  id: string;
  label: Localized;
  dueDate: string;
  amount: number;
  paid: boolean;
  paidAt?: string;
}

export interface ClientDocument {
  id: string;
  label: Localized;
  kind: 'contract' | 'plan' | 'invoice' | 'receipt' | 'other';
  date: string;
  href: string;
}

export interface ClientMessage {
  id: string;
  from: 'imf' | 'client';
  date: string;
  body: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
  role: 'client' | 'admin';
  projectSlug?: string;
  lotRef?: string;
  payments?: PaymentLine[];
  documents?: ClientDocument[];
  messages?: ClientMessage[];
}

export interface Database {
  projects: Project[];
  news: NewsItem[];
  users: User[];
  contacts: Contact[];
  deals: Deal[];
  activities: Activity[];
  tasks: CrmTask[];
}
