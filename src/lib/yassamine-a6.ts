import type { Lot, Project } from './types';

/** Areas transcribed from the individual A6.a/A6.b sales sheets supplied by IMF.
 * grossArea = "surface hors-oeuvre"; sellableArea = "surface du plancher".
 * The sheets do not establish availability or prices.
 */
const A6_FACTS = [
  ['A6.a', 0, 1, 'S+3', 79.04, 89.97, 78],
  ['A6.a', 0, 2, 'S+3', 79.25, 90.21, 82],
  ['A6.a', 0, 3, 'S+2', 63.92, 72.76],
  ['A6.a', 0, 4, 'S+2', 62.19, 70.79],
  ['A6.a', 1, 1, 'S+3', 79.06, 90.00],
  ['A6.a', 1, 2, 'S+3', 79.23, 90.19],
  ['A6.a', 1, 3, 'S+3', 77.79, 88.55],
  ['A6.a', 1, 4, 'S+3', 75.84, 86.33],
  ['A6.a', 2, 1, 'S+3', 79.06, 90.00],
  ['A6.a', 2, 2, 'S+3', 79.23, 90.19],
  ['A6.a', 2, 3, 'S+3', 77.79, 88.55],
  ['A6.a', 2, 4, 'S+3', 75.84, 86.33],
  ['A6.a', 3, 1, 'S+3', 79.06, 90.00],
  ['A6.a', 3, 2, 'S+3', 79.23, 90.19],
  ['A6.a', 3, 3, 'S+3', 77.79, 88.55],
  ['A6.a', 3, 4, 'S+3', 75.84, 86.33],
  ['A6.a', 4, 1, 'S+2', 65.36, 74.40],
  ['A6.a', 4, 2, 'S+2', 62.43, 71.07],
  ['A6.a', 4, 3, 'S+3', 76.34, 86.90],
  ['A6.a', 4, 4, 'S+3', 75.82, 86.31],
  ['A6.b', 0, 1, 'S+2', 63.98, 73.56, 55],
  ['A6.b', 0, 2, 'S+2', 62.31, 71.64],
  ['A6.b', 0, 3, 'S+3', 88.24, 101.45, 54],
  ['A6.b', 1, 1, 'S+2', 59.80, 68.75],
  ['A6.b', 1, 2, 'S+2', 69.15, 79.50],
  ['A6.b', 1, 3, 'S+3', 90.78, 104.37],
  ['A6.b', 2, 1, 'S+2', 59.80, 68.75],
  ['A6.b', 2, 2, 'S+2', 69.15, 79.50],
  ['A6.b', 2, 3, 'S+3', 90.78, 104.37],
  ['A6.b', 3, 1, 'S+2', 59.80, 68.75],
  ['A6.b', 3, 2, 'S+2', 69.15, 79.50],
  ['A6.b', 3, 3, 'S+3', 90.78, 104.37, undefined, 15.88],
] as const satisfies ReadonlyArray<readonly [string, number, number, string, number, number, number?, number?]>;

export const YASSAMINE_A6_LOTS: Lot[] = A6_FACTS.map(([block, floor, number, typology, grossArea, sellableArea, gardenArea, terraceArea]) => {
  const ref = `${block.replace('.', '')}${floor}${number}`;
  return {
    ref,
    code: `${block}-${floor}.${number}`,
    block,
    floor,
    typology,
    grossArea,
    sellableArea,
    ...(gardenArea ? { gardenArea } : {}),
    ...(terraceArea ? { terraceArea } : {}),
    status: 'unconfirmed',
    planUrl: `/plans/diar-al-yassamine/presentation/${ref}.pdf`,
    planImage: `/plans/diar-al-yassamine/presentation/${ref}.webp`,
  };
});

/** Enrich older durable snapshots without changing the commercial status of an existing lot. */
export function includeYassamineA6Lots(project: Project): Project {
  if (project.slug !== 'diar-al-yassamine') return project;
  for (const source of YASSAMINE_A6_LOTS) {
    const existing = project.lots.find(lot => lot.ref === source.ref);
    if (existing) {
      existing.code = source.code;
      existing.block = source.block;
      existing.floor = source.floor;
      existing.typology = source.typology;
      existing.grossArea = source.grossArea;
      existing.sellableArea = source.sellableArea;
      existing.gardenArea = source.gardenArea;
      existing.terraceArea = source.terraceArea;
      existing.planUrl = source.planUrl;
      existing.planImage = source.planImage;
    } else {
      project.lots.push({ ...source });
    }
  }
  for (const [id, floors] of [['A6.a', [0, 1, 2, 3, 4]], ['A6.b', [0, 1, 2, 3]]] as const) {
    if (!project.blocks.some(block => block.id === id)) project.blocks.push({ id, label: `Bloc ${id}`, floors: [...floors] });
  }
  return project;
}
