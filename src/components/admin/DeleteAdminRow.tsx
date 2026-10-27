'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { commercialAction } from '@/lib/commercial-actions';

type Kind = 'task' | 'client' | 'contact' | 'deal';
type Props = { kind: Kind; id: string; name: string; locale: 'fr' | 'en' | 'ar' };
const copy = {
  fr: {
    remove: 'Supprimer', cancel: 'Annuler', confirm: 'Confirmer la suppression', pending: 'Suppression…',
    password: 'Votre mot de passe administrateur',
    task: 'Cette tâche sera supprimée.',
    deal: 'Cette opportunité sera supprimée du pipeline. Le contact, ses tâches et son historique seront conservés.',
    contact: 'Ce contact, ses opportunités, ses tâches et son historique CRM seront supprimés. Les comptes clients et les appartements sont conservés.',
    client: 'Le compte et tout le dossier client seront supprimés : documents, messages, versements et photos privées. Le client perdra l’accès à son espace. Les appartements et leur statut sont conservés.',
  },
  en: {
    remove: 'Delete', cancel: 'Cancel', confirm: 'Confirm deletion', pending: 'Deleting…',
    password: 'Your administrator password',
    task: 'This task will be deleted.',
    deal: 'This opportunity will be removed from the pipeline. The contact, tasks and activity history will be kept.',
    contact: 'This contact and its opportunities, tasks and CRM history will be deleted. Client accounts and apartments will be kept.',
    client: 'The account and entire client dossier will be deleted, including documents, messages, payments and private photos. The client will lose access. Apartments and their statuses will be kept.',
  },
  ar: {
    remove: 'حذف', cancel: 'إلغاء', confirm: 'تأكيد الحذف', pending: 'جارٍ الحذف…',
    password: 'كلمة مرور المسؤول',
    task: 'سيتم حذف هذه المهمة.',
    deal: 'سيتم حذف هذه الفرصة من مسار المبيعات مع الاحتفاظ بجهة الاتصال والمهام وسجل المتابعة.',
    contact: 'سيتم حذف جهة الاتصال وفرصها ومهامها وسجل المتابعة المرتبط بها. سيتم الاحتفاظ بحسابات العملاء والشقق.',
    client: 'سيتم حذف الحساب وملف العميل بالكامل بما في ذلك المستندات والرسائل والدفعات والصور الخاصة، وسيفقد العميل الوصول إلى حسابه. سيتم الاحتفاظ بالشقق وحالتها.',
  },
};

function DeleteDialog({ kind, id, name, locale, close }: Props & { close: () => void }) {
  const c = copy[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [state, action, pending] = useActionState(commercialAction, { ok: false, message: '' });
  useEffect(() => { if (dialog.current && !dialog.current.open) dialog.current.showModal(); }, []);
  useEffect(() => {
    if (state.ok) { close(); router.refresh(); }
  }, [state.ok, close, router]);
  return <dialog ref={dialog} aria-labelledby={`delete-${kind}-${id}`} onCancel={event => { event.preventDefault(); if (!pending) close(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-start text-ink shadow-xl backdrop:bg-black/50" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <h2 id={`delete-${kind}-${id}`} className="font-display text-2xl">{c.remove} · {name}</h2>
    <p className="mt-4 text-sm leading-relaxed text-ink/70">{c[kind]}</p>
    <form action={action} className="mt-5 space-y-5">
      <input type="hidden" name="operation" value={`${kind}-delete`} />
      <input type="hidden" name={kind} value={id} />
      {kind === 'client' && <label className="block text-sm">{c.password}<input className="field mt-2" type="password" name="sensitivePassword" autoComplete="current-password" required maxLength={72} /></label>}
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="confirm" value="yes" required className="mt-1" /><span>{c.confirm} : <strong>{name}</strong></span></label>
      {state.message && <p role="alert" className="text-sm text-red-700">{state.message}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" disabled={pending} onClick={close} className="min-h-11 rounded-full border border-ink/20 px-5 py-2 text-sm disabled:opacity-50">{c.cancel}</button>
        <button type="submit" disabled={pending} className="min-h-11 rounded-full bg-red-700 px-5 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">{pending ? c.pending : c.remove}</button>
      </div>
    </form>
  </dialog>;
}

export default function DeleteAdminRow(props: Props) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label={`${copy[props.locale].remove} · ${props.name}`} className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">{copy[props.locale].remove}</button>
    {open && <DeleteDialog {...props} close={() => setOpen(false)} />}
  </>;
}
