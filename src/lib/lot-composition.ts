import type { Localized, Lot } from './types';

export function visibleComposition(lot: Lot): Localized[] {
  return lot.composition ?? lot.rooms?.map((room) => room.label) ?? [];
}

/** Keep the three translations aligned, including blank lines in the middle. */
export function parseCompositionColumns(fr: string, en: string, ar: string): Localized[] | null {
  const columns = [fr, en, ar].map((value) => value.trim() ? value.trim().split(/\r?\n/).map((line) => line.trim()) : []);
  const count = columns[0].length;
  if (count !== columns[1].length || count !== columns[2].length || count > 24) return null;
  if (columns.some((lines) => lines.some((line) => !line || line.length > 80))) return null;
  return columns[0].map((value, index) => ({ fr: value, en: columns[1][index], ar: columns[2][index] }));
}
