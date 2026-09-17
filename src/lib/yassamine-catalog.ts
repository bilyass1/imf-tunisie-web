import additions from './yassamine-available.json';
import type { Database } from './types';
import { YASSAMINE_APPROVED_PRICES } from './yassamine-prices';

/** Add the confirmed A1/A2/A3 inventory to older CRM snapshots.
 * Existing lots (including any later reservations/sales) always take precedence.
 */
export function includeYassamineApartments(data: Database): Database {
  const project=data.projects.find(p=>p.slug==='diar-al-yassamine');
  if (!project) return data;
  for (const lot of additions) {
    const existing=project.lots.find(candidate=>candidate.ref===lot.ref);
    if (!existing) {
      project.lots.push({...lot,status:'available'});
    } else if ((!existing.rooms || existing.rooms.length===0) && lot.rooms) {
      // Older saved CRM snapshots predate the 360° panoramas. Enrich only the
      // missing presentation field; sales status, price and contacts stay intact.
      existing.rooms=lot.rooms;
    }
  }
  for (const id of ['A1','A2','A3']) {
    if (!project.blocks.some(block=>block.id===id)) project.blocks.push({id,label:`Bloc ${id}`,floors:[0]});
  }
  for (const lot of project.lots) {
    if (lot.price == null && YASSAMINE_APPROVED_PRICES[lot.ref]) lot.price = YASSAMINE_APPROVED_PRICES[lot.ref];
  }
  return data;
}
