import { LA_GLOIRE_SITE } from './la-gloire-footprints';

// Registration used by the architect viewer's sales-plan hit areas.
// SketchUp uses XY for the plan and Z for height; the viewer rotates Z into world Y.
const scaleX = (140.45673 - 95.30044) / (20.97 + 25.55);
const scaleY = (146.88843 - 100.46371) / (23.17 + 24.29);
export const GLOIRE_MODEL_BASE = .75;
export function gloireModelPlan(x: number, y: number): [number, number] {
  return [95.30044 + (x + 25.55) * scaleX, 100.46371 + (y + 24.29) * scaleY];
}
export function gloireSalesPlan(x: number, y: number): [number, number] {
  return [(x - 95.30044) / scaleX - 25.55, (y - 100.46371) / scaleY - 24.29];
}
export function gloireFloorHeight(floor: number) {
  return GLOIRE_MODEL_BASE + floor * LA_GLOIRE_SITE.floorHeight;
}
