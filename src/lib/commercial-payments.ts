import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Database } from './types';
import { formValue as value, requiredText as text, propertyTarget as target } from './commercial-input';
import { clientProperties, clientPaymentsForProperty } from './client-properties';
import { clientPaymentTotal, parsePaymentAmount, paymentPaidAmount, paymentSummary, paymentToday, updatePaymentStatus, validPaymentDate } from './payments';

/** Validate and apply one payment operation to the optimistic transaction snapshot. */
export function applyPaymentOperation(db:Database,form:FormData) {
  const operation=value(form,'operation');
  if(operation==='payment-total' || operation==='payment-receipt-create' || operation==='payment-receipt-update') {
        const client=db.users.find(user=>user.id===value(form,'client') && user.role==='client');
        if(!client) throw new Error('Client introuvable.');
        const {project,lot}=target(db,form);
        if(!lot || !clientProperties(client).some(property=>property.projectSlug===project.slug && property.lotRef===lot.ref)) throw new Error('Sélectionnez un appartement rattaché à ce client.');
        const property={projectSlug:project.slug,lotRef:lot.ref};
        if(operation==='payment-total') {
          const totalAmount=parsePaymentAmount(value(form,'totalAmount'));
          if(Math.round(totalAmount*1000)<Math.round(paymentSummary(clientPaymentsForProperty(client,property)).scheduled*1000)) throw new Error('Le montant total ne peut pas être inférieur aux échéances déjà prévues.');
          const existing=client.paymentSchedules?.find(schedule=>schedule.projectSlug===project.slug && schedule.lotRef===lot.ref);
          if(existing) existing.totalAmount=totalAmount;
          else (client.paymentSchedules??=[]).push({...property,totalAmount});
        } else {
          const payment=clientPaymentsForProperty(client,property).find(item=>item.id===value(form,'payment'));
          if(!payment) throw new Error('Échéance introuvable pour ce client et cet appartement.');
          const receipt=operation==='payment-receipt-update' ? payment.receipts?.find(item=>item.id===value(form,'receipt')) : undefined;
          if(operation==='payment-receipt-update' && !receipt) throw new Error('Versement introuvable.');
          if(operation==='payment-receipt-create' && (payment.receipts?.length??0)>=1000) throw new Error('Cette échéance est limitée à 1 000 versements.');
          const amount=parsePaymentAmount(value(form,'receiptAmount'));
          const date=value(form,'receiptDate');
          if(!validPaymentDate(date) || date>paymentToday()) throw new Error('Saisissez une date de versement valide, au plus tard aujourd’hui.');
          const reference=value(form,'receiptReference');
          if(reference.length>160) throw new Error('La référence du versement est limitée à 160 caractères.');
          const nextPaid=Math.round(paymentPaidAmount(payment)*1000)-Math.round((receipt?.amount??0)*1000)+Math.round(amount*1000);
          if(nextPaid>Math.round(payment.amount*1000)) throw new Error('Les versements ne peuvent pas dépasser le montant de cette échéance.');
          const next={id:receipt?.id??randomUUID(),amount,date,reference:reference||undefined};
          if(receipt) Object.assign(receipt,next);
          else (payment.receipts??=[]).push(next);
          updatePaymentStatus(payment);
        }
      } else if(operation==='payment-create' || operation==='payment-update') {
        const client=db.users.find(user=>user.id===value(form,'client') && user.role==='client');
        if(!client) throw new Error('Client introuvable.');
        const {project,lot}=target(db,form);
        if(!lot || !clientProperties(client).some(property=>property.projectSlug===project.slug && property.lotRef===lot.ref)) throw new Error('Sélectionnez un appartement rattaché à ce client.');
        const existing=operation==='payment-update' ? client.payments?.find(payment=>payment.id===value(form,'payment')) : undefined;
        if(operation==='payment-update' && (!existing || (existing.projectSlug??client.projectSlug)!==project.slug || (existing.lotRef??client.lotRef)!==lot.ref)) throw new Error('Échéance introuvable pour ce client et cet appartement.');
        if(operation==='payment-create' && (client.payments?.length??0)>=1000) throw new Error('L’échéancier est limité à 1 000 échéances par client.');
        const labelFr=text(form,'paymentLabelFr',160);
        const labelEn=value(form,'paymentLabelEn')||labelFr;
        const labelAr=value(form,'paymentLabelAr')||labelFr;
        if(labelEn.length>160 || labelAr.length>160) throw new Error('Les intitulés des échéances sont limités à 160 caractères.');
        const dueDate=value(form,'dueDate');
        if(!validPaymentDate(dueDate)) throw new Error('Date d’échéance invalide.');
        const amount=parsePaymentAmount(value(form,'amount'));
        const property={projectSlug:project.slug,lotRef:lot.ref};
        const totalAmount=clientPaymentTotal(client,property,lot.price);
        if(operation==='payment-create' && totalAmount===undefined) throw new Error('Renseignez d’abord le montant total de cet appartement.');
        const nextScheduled=Math.round(paymentSummary(clientPaymentsForProperty(client,property)).scheduled*1000)-Math.round((existing?.amount??0)*1000)+Math.round(amount*1000);
        if(totalAmount!==undefined && nextScheduled>Math.round(totalAmount*1000)) throw new Error('Les échéances ne peuvent pas dépasser le montant total de cet appartement.');
        if(existing?.receipts?.length && Math.round(amount*1000)<Math.round(paymentPaidAmount(existing)*1000)) throw new Error('Le montant de l’échéance ne peut pas être inférieur aux versements déjà reçus.');
        const status=value(form,'paymentStatus');
        if(!['pending','paid'].includes(status)) throw new Error('Statut de paiement invalide.');
        const paid=status==='paid';
        const paidAt=paid ? value(form,'paidAt') : undefined;
        if(paid && !existing?.receipts?.length && (!paidAt || !validPaymentDate(paidAt) || paidAt>paymentToday())) throw new Error('Saisissez une date de règlement valide, au plus tard aujourd’hui.');
        const payment={id:existing?.id??randomUUID(),label:{fr:labelFr,en:labelEn,ar:labelAr},dueDate,amount,paid,paidAt,projectSlug:project.slug,lotRef:lot.ref};
        if(existing) { Object.assign(existing,payment); updatePaymentStatus(existing); }
        else (client.payments??=[]).push(payment);
  } else throw new Error('Opération de paiement inconnue.');
}
