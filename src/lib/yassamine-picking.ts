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

export function yassamineApartmentHref(locale: string, ref: string) {
  const language=['fr','en','ar'].includes(locale)?locale:'fr';
  return `/${language}/projets/diar-al-yassamine/appartements/${encodeURIComponent(ref)}`;
}
