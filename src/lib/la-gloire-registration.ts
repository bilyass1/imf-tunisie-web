import { LA_GLOIRE_SITE } from './la-gloire-footprints';

// Registration used by the architect viewer's sales-plan hit areas.
// Sales sheets use X east / Y south. SketchUp uses X east / Y north / Z up.
// The rendered building is rotated afterwards: never mirror its source geometry.
const scaleX = (140.45673 - 95.30044) / (20.97 + 25.55);
const scaleY = (146.88843 - 100.46371) / (23.17 + 24.29);
// Finished slab tops in the supplied GLB: 3.50, 6.75, 10.00, 13.25,
// 16.50, 19.75 and roof 23.00 m. 0.75 was not this model's ground floor.
export const GLOIRE_MODEL_BASE = 3.5;
export const GLOIRE_ROOF_ALLOWANCE = .35;
export function gloireModelPlan(x: number, y: number): [number, number] {
  return [95.30044 + (x + 25.55) * scaleX, 146.88843 - (y + 24.29) * scaleY];
}
export function gloireSalesPlan(x: number, y: number): [number, number] {
  return [(x - 95.30044) / scaleX - 25.55, (146.88843 - y) / scaleY - 24.29];
}

export function gloireFloorAtHeight(height: number, maxFloor: number | 'all' = 'all'): number | null {
  const top = maxFloor === 'all' ? 5 : maxFloor;
  const allowance = maxFloor === 'all' ? GLOIRE_ROOF_ALLOWANCE : .001;
  if (!Number.isFinite(height) || height < GLOIRE_MODEL_BASE - .001 || height > gloireFloorHeight(top + 1) + allowance) return null;
  // A cut slab and the roof belong to the apartment underneath, not a hidden storey.
  return Math.min(top, Math.max(0, Math.floor((height - GLOIRE_MODEL_BASE) / LA_GLOIRE_SITE.floorHeight)));
}
export function gloireFloorHeight(floor: number) {
  return GLOIRE_MODEL_BASE + floor * LA_GLOIRE_SITE.floorHeight;
}
