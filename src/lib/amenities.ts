import type { CustomAmenity, Project } from './types';
import type { Locale } from '@/i18n/config';

export const AMENITY_CHOICES = [
  ['patio', 'Patio paysager'], ['parking', 'Parking'], ['lift', 'Ascenseur'],
  ['security', 'Contrôle d’accès'], ['garden', 'Jardins'], ['terrace', 'Terrasses'],
  ['kitchen', 'Cuisine équipée'], ['aluminium', 'Menuiserie aluminium'], ['heating', 'Chauffage central'],
] as const;
export type AmenityIcon = typeof AMENITY_CHOICES[number][0];
export const MAX_CUSTOM_AMENITIES = 20;

export function isAmenityIcon(value: string): value is AmenityIcon {
  return AMENITY_CHOICES.some(([code]) => code === value);
}

export function parseCustomAmenities(raw: string): CustomAmenity[] {
  if (raw.length > 32000) throw new Error('La liste des prestations est trop longue.');
  let entries: unknown;
  try { entries = JSON.parse(raw); } catch { throw new Error('Liste des prestations personnalisées invalide.'); }
  if (!Array.isArray(entries) || entries.length > MAX_CUSTOM_AMENITIES) throw new Error(`Ajoutez au maximum ${MAX_CUSTOM_AMENITIES} prestations personnalisées.`);
  const ids = new Set<string>();
  return entries.map(entry => {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || !/^custom-[a-z0-9-]{1,64}$/.test(entry.id) || ids.has(entry.id)) throw new Error('Identifiant de prestation invalide ou dupliqué.');
    ids.add(entry.id);
    if (typeof entry.icon !== 'string' || !isAmenityIcon(entry.icon)) throw new Error('Choisissez un pictogramme proposé.');
    const label = entry.label;
    if (!label || typeof label !== 'object' || typeof label.fr !== 'string' || !label.fr.trim()) throw new Error('Renseignez le nom français de chaque prestation.');
    if (['fr', 'en', 'ar'].some(language => label[language] !== undefined && (typeof label[language] !== 'string' || label[language].trim().length > 120))) throw new Error('Les intitulés des prestations sont limités à 120 caractères.');
    const fr = label.fr.trim();
    return { id: entry.id, icon: entry.icon, label: { fr, en: label.en?.trim() || fr, ar: label.ar?.trim() || fr } };
  });
}

export function selectedAmenities(values: string[], custom: CustomAmenity[]): string[] {
  const allowed = new Set<string>([...AMENITY_CHOICES.map(([code]) => code), ...custom.map(item => item.id)]);
  if (values.length > 60 || values.some(value => !allowed.has(value))) throw new Error('Une prestation sélectionnée est inconnue. Rechargez le formulaire.');
  return values.filter((value, index) => values.indexOf(value) === index);
}

export function displayedAmenities(project: Pick<Project, 'amenities' | 'customAmenities'>, locale: Locale, standardLabels: Record<string, string>) {
  return project.amenities.filter((id, index, list) => list.indexOf(id) === index).flatMap(id => {
    const custom = project.customAmenities?.find(item => item.id === id);
    if (custom) return [{ id, icon: isAmenityIcon(custom.icon) ? custom.icon : 'kitchen' as AmenityIcon, label: custom.label[locale] || custom.label.fr }];
    return isAmenityIcon(id) ? [{ id, icon: id, label: standardLabels[id] || AMENITY_CHOICES.find(([code]) => code === id)![1] }] : [];
  });
}
