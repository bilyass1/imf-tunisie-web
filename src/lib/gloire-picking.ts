import type { Lot } from './types';
import { LA_GLOIRE_FOOTPRINTS, LA_GLOIRE_SITE, type Footprint } from './la-gloire-footprints';

export function insideGloireFootprint(x: number, y: number, polygon: Footprint): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[j], [bx, by] = polygon[i];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

export function gloireLotAtPlanPoint(lots: Lot[], floor: number, x: number, y: number): Lot | null {
  return lots.find(lot => lot.floor === floor && LA_GLOIRE_FOOTPRINTS[lot.ref]
    && insideGloireFootprint(x, y, LA_GLOIRE_FOOTPRINTS[lot.ref])) ?? null;
}

/** Exact integer IDs: Canvas anti-aliasing could blend two IDs into a third apartment. */
export function gloireAvailabilityAtlas(lots: Lot[], tile = 512) {
  const width = tile * 2, height = tile * 3;
  const data = new Uint8Array(width * height * 4);
  const byIndex: (Lot | undefined)[] = [undefined];
  const b = LA_GLOIRE_SITE.bounds, dx = b.maxX - b.minX, dy = b.maxY - b.minY;
  for (const lot of lots) {
    const polygon = LA_GLOIRE_FOOTPRINTS[lot.ref];
    if (!polygon || lot.floor < 0 || lot.floor > 5) continue;
    const index = byIndex.length;
    if (index > 255) throw new Error('Too many apartments in the availability atlas.');
    byIndex.push(lot);
    const xs = polygon.map(p => (p[0] - b.minX) / dx * tile);
    const ys = polygon.map(p => (p[1] - b.minY) / dy * tile);
    for (let py = Math.max(0, Math.floor(Math.min(...ys))); py < Math.min(tile, Math.ceil(Math.max(...ys))); py++) {
      for (let px = Math.max(0, Math.floor(Math.min(...xs))); px < Math.min(tile, Math.ceil(Math.max(...xs))); px++) {
        const offset = ((py + Math.floor(lot.floor / 2) * tile) * width + px + lot.floor % 2 * tile) * 4;
        if (data[offset + 3] || !insideGloireFootprint(b.minX + (px + .5) / tile * dx, b.minY + (py + .5) / tile * dy, polygon)) continue;
        data[offset] = index; data[offset + 3] = 255;
      }
    }
  }
  return { data, width, height, byIndex };
}
