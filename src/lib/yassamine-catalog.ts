import additions from './yassamine-available.json';
import type { Database } from './types';

/** Add the confirmed A1/A2/A3 inventory to older CRM snapshots.
 * Existing lots (including any later reservations/sales) always take precedence.
 */
export function includeYassamineApartments(data: Database): Database {
  const project=data.projects.find(p=>p.slug==='diar-al-yassamine');
  if (!project) return data;
  for (const lot of additions) {
    if (!project.lots.some(existing=>existing.ref===lot.ref)) {
      project.lots.push({...lot,status:'available'});
    }
  }
  for (const id of ['A1','A2','A3']) {
    if (!project.blocks.some(block=>block.id===id)) project.blocks.push({id,label:`Bloc ${id}`,floors:[0]});
  }
  return data;
}
