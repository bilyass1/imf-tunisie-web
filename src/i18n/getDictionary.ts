import 'server-only';
import type { Locale } from './config';
import fr from './dictionaries/fr.json';
import en from './dictionaries/en.json';
import ar from './dictionaries/ar.json';

export type Dictionary = typeof fr;

const dictionaries: Record<Locale, Dictionary> = {
  fr,
  en: en as unknown as Dictionary,
  ar: ar as unknown as Dictionary,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.fr;
}
