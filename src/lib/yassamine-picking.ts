import type { Lot } from './types';

export type MaquetteLot = Pick<Lot, 'ref' | 'code' | 'block' | 'floor'>;
type Point = readonly [number, number];
type PickingLevel = { block: string; floor: number; textureBounds: [Point, Point] };

// Selection masks traced along the coloured apartment boundaries in the existing
// A5a-0.webp (999 × 1101) and A5a-1.webp (1057 × 1167) plans.
// These do not alter the model. Stairs, lifts and open courtyards are excluded.
const ground: Point[][] = [
  [[393,0],[999,0],[999,310],[782,310],[782,531],[626,531],[626,325],[393,325]],
  [[0,0],[390,0],[390,326],[310,326],[310,465],[201,465],[201,579],[0,579]],
  [[0,668],[156,668],[156,721],[394,721],[394,1101],[0,1101]],
  [[415,653],[626,653],[626,535],[780,535],[780,751],[999,751],[999,1101],[398,1101],[398,723]],
];
const upper: Point[][] = [
  [[450,0],[1057,0],[1057,376],[832,376],[832,600],[687,600],[687,480],[497,480],[497,403],[450,403]],
  [[0,0],[447,0],[447,403],[366,403],[366,537],[230,537],[230,643],[0,643]],
  [[0,648],[354,648],[354,718],[403,718],[403,921],[456,921],[456,1167],[0,1167]],
  [[407,723],[686,723],[686,605],[830,605],[830,818],[1057,818],[1057,1167],[460,1167],[460,921],[407,921]],
];

// A5.b labels are printed on the supplied floor drawings, but no individual
// sales sheets or published lot records exist for this block. These conservative
// interior masks identify a label on hover only; they do not create listings.
// Coordinates refer to A5b-0.webp (1269 × 1098) and A5b-1.webp (1266 × 1099).
const a5bGround: ReadonlyArray<readonly [number, Point[]]> = [
  [1, [[0,0],[605,0],[605,320],[580,400],[380,400],[380,525],[220,525],[220,300],[0,300]]],
  [2, [[0,535],[215,535],[215,750],[375,750],[375,735],[510,735],[510,1020],[350,1020],[350,1098],[0,1098]]],
  [3, [[805,410],[1269,410],[1269,1098],[600,1098],[600,930],[700,930],[700,550],[805,550]]],
  [4, [[610,0],[1269,0],[1269,180],[880,180],[880,335],[800,410],[700,410],[610,320]]],
];
const a5bUpper: ReadonlyArray<readonly [number, Point[]]> = [
  [1, [[0,535],[215,535],[215,750],[375,750],[375,735],[645,735],[645,925],[365,925],[365,1099],[0,1099]]],
  [2, [[605,660],[1266,660],[1266,1099],[605,1099]]],
  [3, [[820,250],[1266,250],[1266,650],[700,650],[700,530],[820,530]]],
  [4, [[615,0],[1266,0],[1266,245],[815,245],[815,500],[700,500],[615,370]]],
  [5, [[0,0],[610,0],[610,315],[580,405],[385,405],[385,525],[220,525],[220,310],[0,310]]],
];

function contains(polygon: Point[], x: number, y: number) {
  let inside = false;
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [ax,ay]=polygon[i], [bx,by]=polygon[j];
    if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
  }
  return inside;
}

export function mappedYassamineLots(lots: readonly MaquetteLot[]) {
  return lots.filter(lot => lot.block==='A5.a' && Number.isInteger(lot.floor)
    && lot.floor>=0 && lot.floor<=4 && /^A5-[0-4]\.[1-4]$/.test(lot.code)
    && Number(lot.code.charAt(3))===lot.floor);
}

/** Lots with individual sales sheets; A6 is navigable even where 3D hit regions are unavailable. */
export function listedYassamineLots(lots: readonly MaquetteLot[]) {
  return lots.filter(lot => mappedYassamineLots([lot]).length > 0
    || (/^A6\.[ab]$/.test(lot.block) && /^A6\.[ab]-[0-4]\.[1-4]$/.test(lot.code)));
}

export function yassamineLotAtPoint(level: PickingLevel, x: number, z: number, lots: readonly MaquetteLot[]) {
  if (level.block!=='A5.a') return undefined;
  const [[x0,z0],[x1,z1]]=level.textureBounds;
  const isGround=level.floor===0;
  const u=(x-x0)/(x1-x0)*(isGround?999:1057);
  const v=(z-z0)/(z1-z0)*(isGround?1101:1167);
  const index=(isGround?ground:upper).findIndex(polygon=>contains(polygon,u,v));
  if(index<0) return undefined;
  return mappedYassamineLots(lots).find(lot=>lot.floor===level.floor && lot.code===`A5-${level.floor}.${index+1}`);
}

/** Printed A5.b plan label only; never infer a listing, status or sales link. */
export function yassamineA5bPlanCodeAtPoint(level: PickingLevel, x: number, z: number): string | undefined {
  if (level.block !== 'A5.b' || !Number.isInteger(level.floor) || level.floor < 0 || level.floor > 4) return undefined;
  const [[x0,z0],[x1,z1]]=level.textureBounds;
  const groundFloor=level.floor===0;
  const u=(x-x0)/(x1-x0)*(groundFloor?1269:1266);
  const v=(z-z0)/(z1-z0)*(groundFloor?1098:1099);
  const apartment=(groundFloor?a5bGround:a5bUpper).find(([_,polygon])=>contains(polygon,u,v))?.[0];
  return apartment ? `A5.b-${level.floor}.${apartment}` : undefined;
}

export function yassamineApartmentHref(locale: string, ref: string) {
  const language=['fr','en','ar'].includes(locale)?locale:'fr';
  return `/${language}/projets/diar-al-yassamine/appartements/${encodeURIComponent(ref)}`;
}
