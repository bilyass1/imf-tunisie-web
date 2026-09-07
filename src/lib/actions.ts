'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  addActivity,
  addContact,
  addTask,
  applyDemoStatuses,
  captureWebLead,
  clearDemoCrm,
  getUserByEmail,
  readDb,
  resetLotStatuses,
  setDealStage,
  toggleTask,
  updateDeal,
  updateLotPrice,
  updateLotStatus,
  writeDb,
} from './db';
import { createSession, destroySession, getSession } from './session';
import type { ActivityType, ContactSource, DealStage, LotStatus } from './types';

export interface FormState {
  ok: boolean;
  error?: string;
  done?: boolean;
}

/* ------------------------- Formulaire contact ------------------------ */

export async function submitLeadAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();

  if (!name || !phone || !message) {
    return { ok: false, error: 'required' };
  }

  try {
    captureWebLead({
      name,
      email,
      phone,
      message,
      projectSlug: String(formData.get('project') ?? '') || undefined,
      lotRef: String(formData.get('lot') ?? '') || undefined,
      budget: String(formData.get('budget') ?? '') || undefined,
    });
    revalidatePath('/', 'layout');
    return { ok: true, done: true };
  } catch {
    return { ok: false, error: 'server' };
  }
}

/* ------------------------------ Auth -------------------------------- */

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const locale = String(formData.get('locale') ?? 'fr');
  const scope = String(formData.get('scope') ?? 'client');

  const user = getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return { ok: false, error: 'invalid' };
  }
  if (scope === 'admin' && user.role !== 'admin') {
    return { ok: false, error: 'invalid' };
  }

  await createSession({ sub: user.id, email: user.email, name: user.name, role: user.role });

  redirect(user.role === 'admin' && scope === 'admin' ? `/${locale}/admin` : `/${locale}/espace-client`);
}

export async function logoutAction(formData: FormData): Promise<void> {
  const locale = String(formData.get('locale') ?? 'fr');
  await destroySession();
  redirect(`/${locale}`);
}

/* --------------------------- Espace client --------------------------- */

export async function sendClientMessageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'auth' };

  const body = String(formData.get('body') ?? '').trim();
  if (!body) return { ok: false, error: 'required' };

  const db = readDb();
  const user = db.users.find((u) => u.id === session.sub);
  if (!user) return { ok: false, error: 'auth' };

  user.messages = user.messages ?? [];
  user.messages.push({
    id: `m-${Date.now().toString(36)}`,
    from: 'client',
    date: new Date().toISOString().slice(0, 10),
    body,
  });
  writeDb(db);
  revalidatePath('/[locale]/espace-client', 'page');
  return { ok: true, done: true };
}

/* ----------------------------- Admin -------------------------------- */

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') throw new Error('Unauthorized');
  return session;
}

export async function updateLotStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const projectSlug = String(formData.get('projectSlug') ?? '');
  const lotRef = String(formData.get('lotRef') ?? '');
  const status = String(formData.get('status') ?? 'available') as LotStatus;
  updateLotStatus(projectSlug, lotRef, status);
  revalidatePath('/', 'layout');
}

export async function updateLotPriceAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const projectSlug = String(formData.get('projectSlug') ?? '');
  const lotRef = String(formData.get('lotRef') ?? '');
  const raw = String(formData.get('price') ?? '').trim();
  updateLotPrice(projectSlug, lotRef, raw ? Number(raw) : undefined);
  revalidatePath('/', 'layout');
}

export async function applyDemoAction(formData: FormData): Promise<void> {
  await requireAdmin();
  applyDemoStatuses(String(formData.get('projectSlug') ?? ''));
  revalidatePath('/', 'layout');
}

export async function resetStatusesAction(formData: FormData): Promise<void> {
  await requireAdmin();
  resetLotStatuses(String(formData.get('projectSlug') ?? ''));
  revalidatePath('/', 'layout');
}

/* ------------------------------- CRM -------------------------------- */

export async function setDealStageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  setDealStage(
    String(formData.get('dealId') ?? ''),
    String(formData.get('stage') ?? 'new') as DealStage,
    String(formData.get('lostReason') ?? '') || undefined,
  );
  revalidatePath('/', 'layout');
}

export async function updateDealAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const rawValue = String(formData.get('value') ?? '').trim();
  updateDeal(String(formData.get('dealId') ?? ''), {
    value: rawValue ? Number(rawValue) : undefined,
    expectedCloseDate: String(formData.get('expectedCloseDate') ?? '') || undefined,
  });
  revalidatePath('/', 'layout');
}

export async function addActivityAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return;
  addActivity({
    date: new Date().toISOString().slice(0, 10),
    type: (String(formData.get('type') ?? 'note') as ActivityType) || 'note',
    contactId: String(formData.get('contactId') ?? ''),
    dealId: String(formData.get('dealId') ?? '') || undefined,
    body,
  });
  revalidatePath('/', 'layout');
}

export async function addContactAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  if (!name || !phone) return;
  addContact({
    name,
    phone,
    email: String(formData.get('email') ?? '') || undefined,
    city: String(formData.get('city') ?? '') || undefined,
    source: (String(formData.get('source') ?? 'phone') as ContactSource) || 'phone',
    budget: String(formData.get('budget') ?? '') || undefined,
    tags: String(formData.get('tags') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  });
  revalidatePath('/', 'layout');
}

export async function addTaskAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return;
  addTask({
    title,
    dueDate: String(formData.get('dueDate') ?? '') || new Date().toISOString().slice(0, 10),
    contactId: String(formData.get('contactId') ?? '') || undefined,
    dealId: String(formData.get('dealId') ?? '') || undefined,
  });
  revalidatePath('/', 'layout');
}

export async function toggleTaskAction(formData: FormData): Promise<void> {
  await requireAdmin();
  toggleTask(String(formData.get('taskId') ?? ''));
  revalidatePath('/', 'layout');
}

export async function clearDemoCrmAction(): Promise<void> {
  await requireAdmin();
  clearDemoCrm();
  revalidatePath('/', 'layout');
}
