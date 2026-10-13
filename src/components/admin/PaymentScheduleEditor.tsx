'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import type { Locale } from '@/i18n/config';
import type { PaymentLine, PaymentReceipt, User } from '@/lib/types';
import { clientPaymentsForProperty, clientProperties } from '@/lib/client-properties';
import { formatDate, formatMoney } from '@/lib/format';
import { clientPaymentTotal, MAX_PAYMENT_AMOUNT, paymentSummary, paymentToday } from '@/lib/payments';
import AdminForm from './AdminForm';

type PaymentClient = Pick<User, 'id' | 'properties' | 'projectSlug' | 'lotRef' | 'payments' | 'paymentSchedules'>;
type PaymentProject = { slug: string; name: string; lots: { ref: string; code: string; price?: number }[] };

function PaymentFields({ payment }: { payment?: PaymentLine }) {
  const [paid, setPaid] = useState(payment?.paid ?? false);
  const today = paymentToday();
  return <>
    <div className="grid gap-3 sm:grid-cols-3">
      {(['fr', 'en', 'ar'] as const).map(language => <label key={language} className="block text-sm">
        {language === 'fr' ? 'Intitulé en français' : language === 'en' ? 'English (facultatif)' : 'العربية (اختياري)'}
        <input className="field mt-2" name={`paymentLabel${language[0].toUpperCase()}${language.slice(1)}`} defaultValue={payment?.label[language] ?? ''} required={language === 'fr'} maxLength={160} dir={language === 'ar' ? 'rtl' : 'auto'} />
      </label>)}
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">Date d’échéance<input className="field mt-2" name="dueDate" type="date" defaultValue={payment?.dueDate ?? ''} required /></label>
      <label className="block text-sm">Montant (TND)<input className="field mt-2" name="amount" type="number" min="0.001" max={MAX_PAYMENT_AMOUNT} step="0.001" defaultValue={payment?.amount ?? ''} required /></label>
      {payment?.receipts?.length ? <div className="text-sm text-ink/60"><input type="hidden" name="paymentStatus" value={payment.paid ? 'paid' : 'pending'} />Le statut est calculé à partir des versements enregistrés ci-dessous.</div> : <>
        <label className="block text-sm">Statut<select className="field mt-2" name="paymentStatus" value={paid ? 'paid' : 'pending'} onChange={event => setPaid(event.target.value === 'paid')}><option value="pending">À régler</option><option value="paid">Réglé en totalité</option></select></label>
        {paid && <label className="block text-sm">Date de règlement<input className="field mt-2" name="paidAt" type="date" max={today} defaultValue={payment?.paidAt ?? today} required /></label>}
      </>}
    </div>
  </>;
}

function ReceiptFields({ receipt, maximum }: { receipt?: PaymentReceipt; maximum: number }) {
  const today = paymentToday();
  return <div className="grid gap-3 sm:grid-cols-2">
    <label className="block text-sm">Montant du versement (TND)<input className="field mt-2" name="receiptAmount" type="number" min="0.001" max={maximum} step="0.001" defaultValue={receipt?.amount ?? ''} required /></label>
    <label className="block text-sm">Date du versement<input className="field mt-2" name="receiptDate" type="date" max={today} defaultValue={receipt?.date ?? today} required /></label>
    <label className="block text-sm sm:col-span-2">Référence ou note (facultatif)<input className="field mt-2" name="receiptReference" defaultValue={receipt?.reference ?? ''} maxLength={160} /></label>
  </div>;
}

export default function PaymentScheduleEditor({ client, projects }: { client: PaymentClient; projects: PaymentProject[] }) {
  const { locale: rawLocale } = useParams<{ locale: string }>();
  const locale: Locale = rawLocale === 'en' || rawLocale === 'ar' ? rawLocale : 'fr';
  const [selection, setSelection] = useState('');
  const choices = clientProperties(client).flatMap(property => {
    const project = projects.find(item => item.slug === property.projectSlug);
    const lot = project?.lots.find(item => item.ref === property.lotRef);
    return project && lot ? [{ project, lot, key: JSON.stringify([project.slug, lot.ref]) }] : [];
  });
  const selected = choices.find(item => item.key === selection) ?? choices[0];
  const payments = clientPaymentsForProperty(client, selected ? { projectSlug: selected.project.slug, lotRef: selected.lot.ref } : undefined);
  const apartmentTotal = selected ? clientPaymentTotal(client, { projectSlug: selected.project.slug, lotRef: selected.lot.ref }, selected.lot.price) : undefined;
  const summary = paymentSummary(payments, apartmentTotal);
  const unmatched = (client.payments?.length ?? 0) - choices.reduce((count, item) => count + clientPaymentsForProperty(client, { projectSlug: item.project.slug, lotRef: item.lot.ref }).length, 0);
  const today = paymentToday();
  return <section aria-labelledby={`payments-${client.id}`} className="space-y-5 rounded-2xl border border-ink/10 bg-sand/20 p-4 sm:p-6">
    <h3 id={`payments-${client.id}`} className="font-display text-2xl">Échéancier du client</h3>
    <p className="text-sm text-ink/60">Définissez le montant total de l’appartement, répartissez-le sur plusieurs échéances et enregistrez les versements reçus, y compris les paiements partiels. Le client verra le cumul versé et le solde après l’enregistrement.</p>
    {unmatched > 0 && <p className="text-sm text-ink/60">{unmatched} échéance(s) conservée(s) concernent un bien non rattaché. Rattachez cet appartement pour gérer son échéancier.</p>}
    {!selected ? <p className="text-sm text-ink/60">Rattachez d’abord un appartement à ce client à l’aide du formulaire ci-dessus pour créer son échéancier.</p> : <>
      <label className="block text-sm">Appartement de l’échéancier<select className="field mt-2" value={selected.key} onChange={event => setSelection(event.target.value)}>{choices.map(item => <option key={item.key} value={item.key}>{item.project.name} · {item.lot.code}</option>)}</select></label>
      <AdminForm key={`total/${client.id}/${selected.key}/${apartmentTotal}`} operation="payment-total" title="Montant total de l’appartement">
        <input type="hidden" name="client" value={client.id} /><input type="hidden" name="project" value={selected.project.slug} /><input type="hidden" name="lot" value={selected.lot.ref} />
        <label className="block text-sm">Montant total convenu (TND)<input className="field mt-2" name="totalAmount" type="number" min="0.001" max={MAX_PAYMENT_AMOUNT} step="0.001" defaultValue={apartmentTotal ?? (summary.scheduled || '')} required /></label>
        <p className="text-sm text-ink/55">Ce montant concerne le dossier de ce client. Le prix public de l’appartement reste indépendant.</p>
      </AdminForm>
      <div className="grid gap-3 sm:grid-cols-3">
        {[['Montant total', summary.total], ['Déjà réglé', summary.paid], ['Reste à payer', summary.remaining]].map(([label, amount]) => <div key={label} className="rounded-xl border border-ink/10 bg-white p-4"><p className="text-xs text-ink/55">{label}</p><p className="mt-2 font-display text-xl">{formatMoney(Number(amount), locale, 3)}</p></div>)}
      </div>
      {apartmentTotal !== undefined && <p className="text-sm text-ink/60">Échéances prévues : {formatMoney(summary.scheduled, locale, 3)} · Reste à planifier : {formatMoney(summary.toSchedule, locale, 3)}</p>}
      {!payments.length && <p className="text-sm text-ink/55">Aucune échéance pour cet appartement. Ajoutez la première ci-dessous.</p>}
      {payments.map(payment => {
        const line = paymentSummary([payment]);
        return <details key={payment.id} className="rounded-xl border border-ink/10 bg-white p-4">
        <summary className="cursor-pointer text-sm"><strong>{payment.label.fr} · {formatMoney(payment.amount, locale, 3)}</strong><span className="ms-3 text-ink/60">{formatDate(payment.dueDate, locale)} · {payment.paid ? 'Réglé' : line.paid > 0 ? 'Partiellement réglé' : payment.dueDate < today ? 'En retard' : 'À régler'}</span></summary>
        <div className="mt-4 space-y-4"><p className="text-sm text-ink/60">Déjà versé : {formatMoney(line.paid, locale, 3)} · Reste de l’échéance : {formatMoney(line.remaining, locale, 3)}</p><AdminForm key={JSON.stringify(payment)} operation="payment-update" title="Modifier l’échéance">
          <input type="hidden" name="client" value={client.id} /><input type="hidden" name="payment" value={payment.id} />
          <input type="hidden" name="project" value={selected.project.slug} /><input type="hidden" name="lot" value={selected.lot.ref} />
          <PaymentFields payment={payment} />
        </AdminForm>
        {payment.receipts?.map(receipt => <details key={receipt.id} className="rounded-xl border border-ink/10 bg-sand/20 p-4"><summary className="cursor-pointer text-sm">Versement · {formatMoney(receipt.amount, locale, 3)} · {formatDate(receipt.date, locale)}{receipt.reference ? ` · ${receipt.reference}` : ''}</summary><div className="mt-4"><AdminForm key={JSON.stringify(receipt)} operation="payment-receipt-update" title="Modifier ce versement">
          <input type="hidden" name="client" value={client.id} /><input type="hidden" name="project" value={selected.project.slug} /><input type="hidden" name="lot" value={selected.lot.ref} /><input type="hidden" name="payment" value={payment.id} /><input type="hidden" name="receipt" value={receipt.id} />
          <ReceiptFields receipt={receipt} maximum={(Math.round(line.remaining * 1000) + Math.round(receipt.amount * 1000)) / 1000} />
        </AdminForm></div></details>)}
        {line.remaining > 0 && <AdminForm key={`receipt/${payment.id}/${payment.receipts?.length ?? 0}/${line.paid}`} operation="payment-receipt-create" title="Enregistrer un versement reçu">
          <input type="hidden" name="client" value={client.id} /><input type="hidden" name="project" value={selected.project.slug} /><input type="hidden" name="lot" value={selected.lot.ref} /><input type="hidden" name="payment" value={payment.id} />
          <ReceiptFields maximum={line.remaining} />
        </AdminForm>}
        </div>
      </details>;})}
      {apartmentTotal === undefined ? <p className="text-sm text-ink/60">Enregistrez le montant total ci-dessus avant d’ajouter de nouvelles échéances.</p> : summary.toSchedule > 0 ? <AdminForm key={`${client.id}/${selected.key}/${payments.length}`} operation="payment-create" title="Ajouter une échéance">
        <input type="hidden" name="client" value={client.id} /><input type="hidden" name="project" value={selected.project.slug} /><input type="hidden" name="lot" value={selected.lot.ref} />
        <PaymentFields />
        <p className="text-sm text-ink/55">Vous pouvez ajouter plusieurs échéances jusqu’à répartir le montant total. Pour enregistrer un paiement partiel, laissez l’échéance « À régler » puis ajoutez ses versements.</p>
      </AdminForm> : <p className="text-sm text-ink/60">Le montant total est entièrement réparti sur les échéances.</p>}
    </>}
  </section>;
}
