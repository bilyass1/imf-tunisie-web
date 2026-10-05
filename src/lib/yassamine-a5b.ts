import type { Lot, Project } from './types';

/** Transcribed from the 25 A5.b apartment sales sheets supplied by IMF.
 * grossArea = surface hors-œuvre; sellableArea = surface du plancher.
 * The last value is the uncovered terrace, when the sheet specifies one.
 * The documents contain no prices. New online listings start available as
 * confirmed by IMF, while later commercial changes remain authoritative.
 */
const A5B_FACTS = [
  [0, 1, 'S+2', 65.01, 73.56, 15.88],
  [0, 2, 'S+2', 73.37, 83.02, 1.03],
  [0, 3, 'S+1', 54.78, 61.94, 4.15],
  [0, 4, 'S+2', 61.85, 69.98],
  [0, 5, 'S+3', 84.29, 95.37, 15.86],
  [1, 1, 'S+3', 84.32, 95.40],
  [1, 2, 'S+2', 73.16, 82.78],
  [1, 3, 'S+2', 68.05, 77.00],
  [1, 4, 'S+2', 71.49, 80.89],
  [1, 5, 'S+3', 84.27, 95.35],
  [2, 1, 'S+3', 84.32, 95.40],
  [2, 2, 'S+2', 73.16, 82.78],
  [2, 3, 'S+2', 68.05, 77.00],
  [2, 4, 'S+2', 71.49, 80.89],
  [2, 5, 'S+3', 84.27, 95.35],
  [3, 1, 'S+3', 84.32, 95.40],
  [3, 2, 'S+2', 73.16, 82.78],
  [3, 3, 'S+2', 68.05, 77.00],
  [3, 4, 'S+2', 71.49, 80.89],
  [3, 5, 'S+3', 84.27, 95.35],
  [4, 1, 'S+3', 84.32, 95.40],
  [4, 2, 'S+2', 73.16, 82.78],
  [4, 3, 'S+2', 68.05, 77.00],
  [4, 4, 'S+2', 71.49, 80.89],
  [4, 5, 'S+3', 84.27, 95.35],
] as const satisfies ReadonlyArray<readonly [number, number, string, number, number, number?]>;

export const YASSAMINE_A5B_LOTS: Lot[] = A5B_FACTS.map(([floor, number, typology, grossArea, sellableArea, terraceArea]) => {
  const ref = `A5b${floor}${number}`;
  return {
    ref,
    code: `A5.b-${floor}.${number}`,
    block: 'A5.b',
    floor,
    typology,
    grossArea,
    sellableArea,
    ...(terraceArea ? { terraceArea } : {}),
    status: 'available',
    planUrl: `/plans/diar-al-yassamine/presentation/${ref}.pdf`,
    planImage: `/plans/diar-al-yassamine/presentation/${ref}.webp`,
  };
});

/** Add the verified sheets to older CRM snapshots without resetting sales data. */
export function includeYassamineA5bLots(project: Project): Project {
  if (project.slug !== 'diar-al-yassamine') return project;
  for (const source of YASSAMINE_A5B_LOTS) {
    const existing = project.lots.find(lot => lot.ref === source.ref);
    if (existing) {
      existing.code = source.code;
      existing.block = source.block;
      existing.floor = source.floor;
      existing.typology = source.typology;
      existing.grossArea = source.grossArea;
      existing.sellableArea = source.sellableArea;
      existing.terraceArea = source.terraceArea;
      existing.planUrl = source.planUrl;
      existing.planImage = source.planImage;
    } else {
      project.lots.push({ ...source });
    }
  }
  if (!project.blocks.some(block => block.id === 'A5.b')) {
    project.blocks.push({ id: 'A5.b', label: 'Bloc A5.b', floors: [0, 1, 2, 3, 4] });
  }
  return project;
}
