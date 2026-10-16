'use client';

import { useState } from 'react';
import { AMENITY_ICONS } from '@/components/Icons';
import { AMENITY_CHOICES, MAX_CUSTOM_AMENITIES, type AmenityIcon } from '@/lib/amenities';
import type { CustomAmenity, Localized } from '@/lib/types';

export default function AmenityEditor({ selected, custom = [] }: { selected: string[]; custom?: CustomAmenity[] }) {
  const [items, setItems] = useState(custom);
  const [checked, setChecked] = useState(selected);
  const choices = [
    ...AMENITY_CHOICES.map(([id, label]) => ({ id, label, icon: id })),
    ...items.map(item => ({ id: item.id, label: item.label.fr || 'Nouvelle prestation', icon: item.icon })),
  ];
  const update = (id: string, change: Partial<CustomAmenity>) => setItems(current => current.map(item => item.id === id ? { ...item, ...change } : item));
  const toggle = (id: string, enabled: boolean) => setChecked(current => enabled ? [...current.filter(value => value !== id), id] : current.filter(value => value !== id));
  const add = () => {
    if (items.length >= MAX_CUSTOM_AMENITIES) return;
    const id = `custom-${crypto.randomUUID()}`;
    setItems(current => [...current, { id, icon: 'kitchen', label: { fr: '', en: '', ar: '' } }]);
    toggle(id, true);
  };

  return <div className="space-y-4 border-t border-ink/10 pt-5">
    <fieldset>
      <legend className="text-sm font-semibold">Prestations affichées</legend>
      <p className="mt-3 text-sm text-muted">Sélectionnez les prestations avec les mêmes pictogrammes que sur la fiche publique.</p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {choices.map(choice => {
          const Icon = AMENITY_ICONS[choice.icon];
          return <label key={choice.id} className="cursor-pointer">
            <input className="peer sr-only" type="checkbox" name="amenities" value={choice.id} checked={checked.includes(choice.id)} onChange={event => toggle(choice.id, event.target.checked)} />
            <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-[12.5px] text-ink/65 transition hover:border-gold-500 peer-checked:border-gold-500 peer-checked:bg-gold-50 peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-500">
              {Icon && <Icon className="h-4 w-4 shrink-0 text-gold-500" />}{choice.label}
            </span>
          </label>;
        })}
      </div>
    </fieldset>

    <input type="hidden" name="customAmenities" value={JSON.stringify(items)} />
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <h3 className="text-sm font-semibold">Prestations personnalisées</h3>
      <button type="button" onClick={add} disabled={items.length >= MAX_CUSTOM_AMENITIES} className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50">+ Ajouter une prestation</button>
    </div>
    <p className="text-sm text-muted">Choisissez un pictogramme et saisissez vos intitulés. Le français est obligatoire ; il sera utilisé si une traduction manque. Cliquez sur Enregistrer pour publier vos modifications.</p>
    {items.map((item, index) => <div key={item.id} className="space-y-4 rounded-xl border border-ink/10 bg-sand/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-medium">{item.label.fr || `Nouvelle prestation ${index + 1}`}</h4>
        <button type="button" aria-label={`Supprimer ${item.label.fr || `la prestation ${index + 1}`}`} onClick={() => { setItems(current => current.filter(value => value.id !== item.id)); toggle(item.id, false); }} className="min-h-10 rounded-lg px-3 text-sm text-red-700 hover:bg-red-50">Supprimer</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(['fr', 'en', 'ar'] as const).map(language => <label key={language} className="block text-xs text-ink/65">
          {language === 'fr' ? 'Français (obligatoire)' : language === 'en' ? 'English (facultatif)' : 'العربية (اختياري)'}
          <input className="field mt-2" dir={language === 'ar' ? 'rtl' : 'auto'} value={item.label[language]} maxLength={120} required={language === 'fr'} autoFocus={language === 'fr' && !item.label.fr} onChange={event => update(item.id, { label: { ...item.label, [language]: event.target.value } as Localized })} />
        </label>)}
      </div>
      <label className="block max-w-sm text-sm">Pictogramme
        <select className="field mt-2" value={item.icon} onChange={event => update(item.id, { icon: event.target.value as AmenityIcon })}>
          {AMENITY_CHOICES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
      </label>
    </div>)}
    <p className="text-xs text-muted">{items.length} / {MAX_CUSTOM_AMENITIES} prestations personnalisées. Décochez une prestation pour la masquer ; supprimez-la pour la retirer de ce projet.</p>
  </div>;
}
