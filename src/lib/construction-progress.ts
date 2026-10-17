import type { ProgressStep } from './types';

export const MAX_CONSTRUCTION_STEPS = 30;

/** Validate the complete ordered list before the commercial transaction is saved. */
export function parseConstructionSteps(raw: string): ProgressStep[] {
  if (raw.length > 64000) throw new Error('La liste des étapes du chantier est trop longue.');
  let entries: unknown;
  try { entries = JSON.parse(raw); } catch { throw new Error('Liste des étapes du chantier invalide.'); }
  if (!Array.isArray(entries) || entries.length > MAX_CONSTRUCTION_STEPS) throw new Error(`Ajoutez au maximum ${MAX_CONSTRUCTION_STEPS} étapes par chantier.`);
  const names = new Set<string>();
  return entries.map(entry => {
    if (!entry || typeof entry !== 'object' || !entry.label || typeof entry.label !== 'object') throw new Error('Étape du chantier invalide.');
    const label = entry.label;
    if (typeof label.fr !== 'string' || !label.fr.trim()) throw new Error('Renseignez le nom français de chaque étape.');
    if (['fr', 'en', 'ar'].some(lang => label[lang] !== undefined && (typeof label[lang] !== 'string' || label[lang].trim().length > 120))) throw new Error('Les noms des étapes sont limités à 120 caractères.');
    const fr = label.fr.trim();
    const name = fr.toLocaleLowerCase('fr');
    if (names.has(name)) throw new Error('Donnez un nom différent à chaque étape du chantier.');
    names.add(name);
    if (typeof entry.percent !== 'number' || !Number.isInteger(entry.percent) || entry.percent < 0 || entry.percent > 100) throw new Error('L’avancement de chaque étape doit être un entier compris entre 0 et 100.');
    return { label: { fr, en: label.en?.trim() || fr, ar: label.ar?.trim() || fr }, percent: entry.percent, done: entry.percent === 100 };
  });
}
