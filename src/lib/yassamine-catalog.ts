import additions from './yassamine-available.json';
import { YASSAMINE_A5A_LOTS } from './lots-la-gloire';
import type { Database, Project } from './types';
import { YASSAMINE_APPROVED_PRICES } from './yassamine-prices';

/** Verified, approximate areas and typologies from the 20 individual A5.a sales PDFs.
 * Do not change commercial status, price, or customer records when updating old data.
 */
export function applyYassamineA5aFacts(project: Project): Project {
  if (project.slug !== 'diar-al-yassamine') return project;
  const facts = new Map(YASSAMINE_A5A_LOTS.map(([code, typology, grossArea, sellableArea]) => [
    code.replace(/[.\-]/g, ''), { typology, grossArea, sellableArea },
  ]));
  for (const lot of project.lots) {
    const fact = facts.get(lot.ref);
    if (!fact || lot.block !== 'A5.a') continue;
    lot.typology = fact.typology;
    lot.grossArea = fact.grossArea;
    lot.sellableArea = fact.sellableArea;
    lot.planUrl = `/plans/diar-al-yassamine/${lot.ref}.pdf`;
    lot.planImage = `/plans/diar-al-yassamine/${lot.ref}.webp`;
    if (fact.typology === 'S+3' && lot.rooms?.some(room => room.id === 'chambre-2') && !lot.rooms.some(room => room.id === 'chambre-3')) {
      const next = { id: 'chambre-3', label: { fr: 'Chambre 3', en: 'Bedroom 3', ar: 'غرفة نوم 3' }, panorama: `/360/diar-al-yassamine/${lot.ref}/chambre-3.jpg` };
      const bathroom = lot.rooms.findIndex(room => room.id === 'sdb');
      lot.rooms.splice(bathroom < 0 ? lot.rooms.length : bathroom, 0, next);
    }
  }
  return project;
}

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
  applyYassamineA5aFacts(project);
  return data;
}
