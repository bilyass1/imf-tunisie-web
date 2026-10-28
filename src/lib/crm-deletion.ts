import 'server-only';
import type { Database } from './types';

/** Remove dependent CRM records in the same database write as their parent. */
export function deleteCrmRow(db: Database, kind: 'task' | 'contact' | 'deal', id: string): void {
  if (kind === 'task') {
    if (!db.tasks.some(task => task.id === id)) throw new Error('Tâche introuvable.');
    db.tasks = db.tasks.filter(task => task.id !== id);
    return;
  }
  if (kind === 'deal') {
    if (!db.deals.some(deal => deal.id === id)) throw new Error('Opportunité introuvable.');
    db.deals = db.deals.filter(deal => deal.id !== id);
    // Keep the contact's follow-up history and tasks, without a dangling deal ID.
    for (const row of [...db.tasks, ...db.activities]) if (row.dealId === id) delete row.dealId;
    return;
  }
  if (!db.contacts.some(contact => contact.id === id)) throw new Error('Contact introuvable.');
  const deals = new Set(db.deals.filter(deal => deal.contactId === id).map(deal => deal.id));
  db.contacts = db.contacts.filter(contact => contact.id !== id);
  db.deals = db.deals.filter(deal => !deals.has(deal.id));
  db.tasks = db.tasks.filter(task => task.contactId !== id && (!task.dealId || !deals.has(task.dealId)));
  db.activities = db.activities.filter(activity => activity.contactId !== id && (!activity.dealId || !deals.has(activity.dealId)));
}
