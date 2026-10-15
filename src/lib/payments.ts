import type { PaymentLine, Project, User } from './types';
import { clientPaymentsForProperty, clientProperties, type ClientProperty } from './client-properties';

export const MAX_PAYMENT_AMOUNT = 1_000_000_000;

export function parsePaymentAmount(raw: string): number {
  if (!/^\d{1,10}(?:[.,]\d{1,3})?$/.test(raw)) throw new Error('Saisissez un montant positif avec au maximum trois décimales.');
  const [whole, fraction = ''] = raw.replace(',', '.').split('.');
  const millimes = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  if (millimes <= 0 || millimes > MAX_PAYMENT_AMOUNT * 1000) throw new Error('Le montant doit être positif et ne pas dépasser 1 000 000 000 TND.');
  return millimes / 1000;
}

export function validPaymentDate(raw: string): boolean {
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const date = new Date(`${raw}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === raw;
}

export function paymentToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Add integer millimes to avoid decimal rounding errors in the schedule. */
export function paymentPaidAmount(payment: Pick<PaymentLine, 'amount' | 'paid' | 'receipts'>) {
  return !!payment.receipts?.length
    ? payment.receipts.reduce((sum, receipt) => sum + Math.round(receipt.amount * 1000), 0) / 1000
    : payment.paid ? payment.amount : 0;
}

export function paymentSummary(payments: Pick<PaymentLine, 'amount' | 'paid' | 'receipts'>[], apartmentTotal?: number) {
  const scheduled = payments.reduce((sum, payment) => sum + Math.round(payment.amount * 1000), 0);
  const total = apartmentTotal === undefined ? scheduled : Math.round(apartmentTotal * 1000);
  const paid = payments.reduce((sum, payment) => sum + Math.round(paymentPaidAmount(payment) * 1000), 0);
  return { total: total / 1000, scheduled: scheduled / 1000, paid: paid / 1000, remaining: (total - paid) / 1000, toSchedule: (total - scheduled) / 1000 };
}

export function clientPaymentTotal(user: Pick<User, 'paymentSchedules'>, property?: ClientProperty, lotPrice?: number): number | undefined {
  if (!property) return undefined;
  const total = user.paymentSchedules?.find(schedule => schedule.projectSlug === property.projectSlug && schedule.lotRef === property.lotRef)?.totalAmount;
  return total !== undefined ? total : lotPrice && lotPrice > 0 ? lotPrice : undefined;
}

export function paymentIsPaid(payment: Pick<PaymentLine,'amount'|'paid'|'receipts'>) {
  return Math.round(paymentPaidAmount(payment)*1000) >= Math.round(payment.amount*1000);
}

export function updatePaymentStatus(payment: PaymentLine) {
  if (!payment.receipts?.length) return;
  payment.paid = Math.round(paymentPaidAmount(payment) * 1000) === Math.round(payment.amount * 1000);
  payment.paidAt = payment.paid ? payment.receipts.map(receipt => receipt.date).sort().at(-1) : undefined;
}

export function clientPaymentSummary(user: Pick<User, 'payments' | 'paymentSchedules' | 'properties' | 'projectSlug' | 'lotRef'>, projects: Project[]) {
  const properties = clientProperties(user);
  const payments = properties.flatMap(property => clientPaymentsForProperty(user, property));
  const total = properties.reduce((sum, property) => {
    const lot = projects.find(project => project.slug === property.projectSlug)?.lots.find(item => item.ref === property.lotRef);
    return sum + Math.round(paymentSummary(clientPaymentsForProperty(user, property), clientPaymentTotal(user, property, lot?.price)).total * 1000);
  }, 0) / 1000;
  return paymentSummary(payments, total);
}
