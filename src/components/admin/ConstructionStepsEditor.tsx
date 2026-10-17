'use client';

import { useState } from 'react';
import { MAX_CONSTRUCTION_STEPS } from '@/lib/construction-progress';
import type { ProgressStep } from '@/lib/types';

export default function ConstructionStepsEditor({steps = []}: {steps?: ProgressStep[]}) {
  const [items, setItems] = useState(() => steps.map((step, index) => ({id: `existing-${index}`, label: {...step.label}, percent: String(step.percent)})));
  function move(index: number, direction: number) {
    setItems(current => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  }
  return <div className="min-w-0 space-y-4 border-t border-ink/10 pt-5" data-construction-editor>
    <input type="hidden" name="progressSteps" value={JSON.stringify(items.map(item => ({label: item.label, percent: item.percent.trim() === '' ? null : Number(item.percent)})))}/>
    <div><h3 className="text-sm font-semibold">Étapes du chantier</h3><p className="mt-1 text-sm text-ink/60">Ajoutez, modifiez et ordonnez les étapes de cette résidence. Elles seront visibles sur le site et dans l’espace client après enregistrement.</p></div>
    {!items.length && <p className="rounded-xl border border-dashed border-ink/20 p-4 text-sm text-ink/60">Aucune étape. Ajoutez la première étape du chantier.</p>}
    {items.map((item, index) => <fieldset key={item.id} className="min-w-0 space-y-3 rounded-xl border border-ink/10 p-4">
      <legend className="px-1 text-sm font-semibold">Étape {index + 1}</legend>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="block min-w-0 text-sm">Nom de l’étape<input className="field mt-2" value={item.label.fr} maxLength={120} required onChange={event => setItems(current => current.map(step => step.id === item.id ? {...step, label: {...step.label, fr: event.target.value}} : step))}/></label>
        <label className="block min-w-0 text-sm">Avancement (%)<input className="field mt-2" type="number" min="0" max="100" step="1" required value={item.percent} onChange={event => setItems(current => current.map(step => step.id === item.id ? {...step, percent: event.target.value} : step))}/></label>
      </div>
      <details><summary className="cursor-pointer text-sm text-ink/65">Traductions (facultatives)</summary><div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">{(['en', 'ar'] as const).map(lang => <label key={lang} className="block min-w-0 text-sm">{lang === 'en' ? 'English' : 'العربية'}<input className="field mt-2" dir={lang === 'ar' ? 'rtl' : 'auto'} maxLength={120} value={item.label[lang]} placeholder={item.label.fr} onChange={event => setItems(current => current.map(step => step.id === item.id ? {...step, label: {...step.label, [lang]: event.target.value}} : step))}/></label>)}</div></details>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <button type="button" className="min-h-11 text-sm underline disabled:opacity-30" disabled={index === 0} aria-label={`Monter l’étape ${index + 1}`} onClick={() => move(index, -1)}>Monter</button>
        <button type="button" className="min-h-11 text-sm underline disabled:opacity-30" disabled={index === items.length - 1} aria-label={`Descendre l’étape ${index + 1}`} onClick={() => move(index, 1)}>Descendre</button>
        <button type="button" className="min-h-11 text-sm text-red-700 underline" aria-label={`Retirer l’étape ${index + 1}`} onClick={() => setItems(current => current.filter(step => step.id !== item.id))}>Retirer l’étape</button>
      </div>
    </fieldset>)}
    <div className="flex flex-wrap items-center gap-3"><button type="button" className="btn-ghost disabled:opacity-40" disabled={items.length >= MAX_CONSTRUCTION_STEPS} onClick={() => setItems(current => [...current, {id: crypto.randomUUID(), label: {fr: '', en: '', ar: ''}, percent: '0'}])}>Ajouter une étape</button><span className="text-xs text-ink/55">{items.length} / {MAX_CONSTRUCTION_STEPS} étapes</span></div>
  </div>;
}
