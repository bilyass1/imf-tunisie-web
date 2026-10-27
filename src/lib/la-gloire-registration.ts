import { LA_GLOIRE_SITE } from './la-gloire-footprints';

// Registration used by the architect viewer's sales-plan hit areas.
// SketchUp uses XY for the plan and Z for height; the viewer rotates Z into world Y.
const scaleX = (140.45673 - 95.30044) / (20.97 + 25.55);
const scaleY = (146.88843 - 100.46371) / (23.17 + 24.88);
// Horizontal slab faces measured in the supplied GLB: 3.50, 6.75, 10.00, ...
export const GLOIRE_MODEL_BASE = 3.5;
export function gloireModelPlan(x: number, y: number): [number, number] {
  return [95.30044 + (x + 25.55) * scaleX, 146.88843 - (y + 24.88) * scaleY];
}
export function gloireSalesPlan(x: number, y: number): [number, number] {
  return [(x - 95.30044) / scaleX - 25.55, (146.88843 - y) / scaleY - 24.88];
}
export function gloireFloorHeight(floor: number) {
  return GLOIRE_MODEL_BASE + floor * LA_GLOIRE_SITE.floorHeight;
}
