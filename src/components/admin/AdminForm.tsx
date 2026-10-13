'use client';

import { useActionState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { commercialAction } from '@/lib/commercial-actions';
import { showCommercialPublicPreview } from './CommercialPublicPreview';

export default function AdminForm({ operation, title, children }: { operation: string; title: string; children: ReactNode }) {
  const [state, action, pending] = useActionState(commercialAction, { ok: false, message: '' });
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  useEffect(() => {
    if (state.ok) { router.refresh(); if (state.publicPath) showCommercialPublicPreview(state.publicPath, true); }
  }, [state, router]);
  const buttonLabel = operation === 'client-delete' ? 'Supprimer définitivement le dossier'
    : operation === 'payment-total' ? 'Enregistrer le montant total'
    : operation === 'payment-receipt-create' ? 'Enregistrer le versement'
    : operation === 'payment-create' ? 'Ajouter l’échéance'
    : operation === 'gallery-remove' ? 'Retirer la photo'
    : operation === 'client-property-add' ? 'Ajouter cet appartement'
    : operation === 'client-property-remove' ? 'Retirer cet appartement'
    : operation === 'client-property-primary' ? 'Définir comme principal'
    : operation === 'document-remove' ? 'Supprimer du dossier'
    : operation === 'document-restore' ? 'Restaurer'
    : operation === 'upload' ? 'Publier'
    : operation === 'client' ? 'Créer le compte' : 'Enregistrer';
  return <form action={action} className="space-y-5 rounded-2xl border border-ink/10 bg-white p-4 sm:p-6">
    <h2 className="font-display text-2xl">{title}</h2>
    <input type="hidden" name="operation" value={operation} />
    {children}
    <button disabled={pending} className={operation === 'client-delete' ? 'inline-flex min-h-11 items-center justify-center rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50' : 'btn-gold disabled:opacity-50'}>{pending ? 'Enregistrement…' : buttonLabel}</button>
    {state.message && <p role="status" className={state.ok ? 'text-emerald-700' : 'text-red-700'}>{state.message}</p>}
    {state.ok && state.publicPath && <Link href={`/${locale}${state.publicPath}`} target="_blank" className="inline-block text-sm font-semibold text-gold-700 underline">Voir la modification sur le site public</Link>}
  </form>;
}
