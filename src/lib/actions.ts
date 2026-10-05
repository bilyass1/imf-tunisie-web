'use server';

import bcrypt from 'bcryptjs';
import { sendChatMessage } from './chat-actions';
import { isLocale } from '@/i18n/config';
import { allowRequest } from './rate-limit';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  addActivity,
  addContact,
  addTask,
  applyDemoStatuses,
  captureWebLead,
  clearDemoCrm,
  getAuthUserByEmail,
  readDb,
  resetLotStatuses,
  setDealStage,
  toggleTask,
  updateDeal,
  updateLotPrice,
  updateLotComposition,
  updateLotStatus,
  writeDb,
} from './db';
import { createSession, destroySession, getSession } from './session';
import type { ActivityType, ContactSource, DealStage, LotStatus } from './types';
import { parseCompositionColumns } from './lot-composition';
import { validVisitRequest, type VisitRequest } from './visit-request';

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
  if (formData.get('website')) return { ok: true, done: true };
  const visit: VisitRequest | undefined = formData.get('intent') === 'visit' ? {
    date: String(formData.get('visitDate') ?? ''), time: String(formData.get('visitTime') ?? ''),
    mode: String(formData.get('visitMode') ?? '') as VisitRequest['mode'],
  } : undefined;
  if (visit && (!validVisitRequest(visit) || formData.get('consent') !== 'on')) return { ok: false, error: 'visit' };

  if (!name || !phone || !message || name.length>200 || phone.length>80 || message.length>4000 || email.length>254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { ok: false, error: 'required' };
  }

  try {
    if(!await allowRequest('contact-global','all',30,60000)||!await allowRequest('contact',phone,5,3600000)) return {ok:false,error:'server'};
    for(const key of ['project','lot','budget']) if(String(formData.get(key)??'').length>200) return {ok:false,error:'required'};
    (await captureWebLead({
      name,
      email,
      phone,
      message,
      projectSlug: String(formData.get('project') ?? '') || undefined,
      lotRef: String(formData.get('lot') ?? '') || undefined,
      budget: String(formData.get('budget') ?? '') || undefined,
      visit,
    }));
    revalidatePath('/', 'layout');
    return { ok: true, done: true };
  } catch (error) {
    if (error instanceof Error && error.message === 'VISIT_UNAVAILABLE') return { ok: false, error: 'unavailable' };
    return { ok: false, error: 'server' };
  }
}

/* ------------------------------ Auth -------------------------------- */

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const rawLocale = String(formData.get('locale') ?? 'fr');
  const locale = isLocale(rawLocale)?rawLocale:'fr';
  const scope = String(formData.get('scope') ?? 'client');

  if(!email || email.length>254 || !password || password.length>1024 || !await allowRequest('login-global','all',100,60000) || !await allowRequest('login-account',email,10,600000)) return {ok:false,error:'invalid'};

  const user = (await getAuthUserByEmail(email));
  if (password.length>1024 || !user || !await bcrypt.compare(password, user.passwordHash)) {
    return { ok: false, error: 'invalid' };
  }
  if (scope === 'admin' && user.role !== 'admin') {
    return { ok: false, error: 'invalid' };
  }

  await createSession({ sub: user.id, email: user.email, name: user.name, role: user.role });

  redirect(user.role === 'admin' && scope === 'admin' ? `/${locale}/admin` : `/${locale}/espace-client`);
}

export async function logoutAction(formData: FormData): Promise<void> {
  const raw = String(formData.get('locale') ?? 'fr');
  const locale = isLocale(raw)?raw:'fr';
  await destroySession();
  redirect(`/${locale}`);
}

/* --------------------------- Espace client --------------------------- */

export async function sendClientMessageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const result=await sendChatMessage({ok:false,message:''},formData);
  return result.ok?{ok:true,done:true}:{ok:false,error:result.message};
}

/* ----------------------------- Admin -------------------------------- */

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin' || (await readDb()).users.find(u=>u.id===session.sub)?.role!=='admin') throw new Error('Unauthorized');
  return session;
}

export async function updateLotStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const projectSlug = String(formData.get('projectSlug') ?? '');
  const lotRef = String(formData.get('lotRef') ?? '');
  const status = String(formData.get('status') ?? 'available') as LotStatus;
  if(!['available','reserved','sold','unconfirmed'].includes(status)) throw new Error('Invalid status');
  (await updateLotStatus(projectSlug, lotRef, status));
  revalidatePath('/', 'layout');
}

export async function updateLotPriceAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const projectSlug = String(formData.get('projectSlug') ?? '');
  const lotRef = String(formData.get('lotRef') ?? '');
  const raw = String(formData.get('price') ?? '').trim();
  if(raw && (!Number.isFinite(Number(raw)) || Number(raw)<0)) throw new Error('Invalid price');
  (await updateLotPrice(projectSlug, lotRef, raw ? Number(raw) : undefined));
  revalidatePath('/', 'layout');
}

export async function updateLotCompositionAction(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const projectSlug = String(formData.get('projectSlug') ?? '');
  const lotRef = String(formData.get('lotRef') ?? '');
  if (!projectSlug || !lotRef) return { ok: false, error: 'missing' };
  const composition = parseCompositionColumns(
    String(formData.get('compositionFr') ?? ''),
    String(formData.get('compositionEn') ?? ''),
    String(formData.get('compositionAr') ?? ''),
  );
  if (!composition) return { ok: false, error: 'invalid' };
  if (!await updateLotComposition(projectSlug, lotRef, composition)) return { ok: false, error: 'missing' };
  revalidatePath('/', 'layout');
  return { ok: true, done: true };
}

export async function applyDemoAction(formData: FormData): Promise<void> {
  await requireAdmin();
  (await applyDemoStatuses(String(formData.get('projectSlug') ?? '')));
  revalidatePath('/', 'layout');
}

export async function resetStatusesAction(formData: FormData): Promise<void> {
  await requireAdmin();
  (await resetLotStatuses(String(formData.get('projectSlug') ?? '')));
  revalidatePath('/', 'layout');
}

/* ------------------------------- CRM -------------------------------- */

export async function setDealStageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  (await setDealStage(
    String(formData.get('dealId') ?? ''),
    String(formData.get('stage') ?? 'new') as DealStage,
    String(formData.get('lostReason') ?? '') || undefined,
  ));
  revalidatePath('/', 'layout');
}

export async function updateDealAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const rawValue = String(formData.get('value') ?? '').trim();
  (await updateDeal(String(formData.get('dealId') ?? ''), {
    value: rawValue ? Number(rawValue) : undefined,
    expectedCloseDate: String(formData.get('expectedCloseDate') ?? '') || undefined,
  }));
  revalidatePath('/', 'layout');
}

export async function addActivityAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return;
  (await addActivity({
    date: new Date().toISOString().slice(0, 10),
    type: (String(formData.get('type') ?? 'note') as ActivityType) || 'note',
    contactId: String(formData.get('contactId') ?? ''),
    dealId: String(formData.get('dealId') ?? '') || undefined,
    body,
  }));
  revalidatePath('/', 'layout');
}

export async function addContactAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  if (!name || !phone) return;
  (await addContact({
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
  }));
  revalidatePath('/', 'layout');
}

export async function addTaskAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return;
  (await addTask({
    title,
    dueDate: String(formData.get('dueDate') ?? '') || new Date().toISOString().slice(0, 10),
    contactId: String(formData.get('contactId') ?? '') || undefined,
    dealId: String(formData.get('dealId') ?? '') || undefined,
  }));
  revalidatePath('/', 'layout');
}

export async function toggleTaskAction(formData: FormData): Promise<void> {
  await requireAdmin();
  (await toggleTask(String(formData.get('taskId') ?? '')));
  revalidatePath('/', 'layout');
}

export async function clearDemoCrmAction(): Promise<void> {
  await requireAdmin();
  (await clearDemoCrm());
  revalidatePath('/', 'layout');
}
